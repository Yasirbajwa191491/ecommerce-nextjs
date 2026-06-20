import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import type { ReviewCallStatus } from "../lib/reviewCallValidators";
import { enrichToolResult } from "./lib/uiActions";
import { parseVoiceDeliveryMethod } from "./voiceDeliveryHelpers";
import { ConvexError } from "convex/values";

type ToolCall = {
  id: string;
  name: string;
  parameters?: Record<string, unknown>;
  arguments?: Record<string, unknown> | string;
  function?: {
    name?: string;
    arguments?: Record<string, unknown> | string;
  };
};

type VapiCallPayload = {
  id?: string;
  type?: string;
  assistantId?: string;
  metadata?: Record<string, unknown>;
};

type VapiWebhookBody = {
  message?: {
    type?: string;
    role?: string;
    transcript?: string;
    transcriptType?: string;
    status?: string;
    call?: VapiCallPayload;
    toolCallList?: ToolCall[];
    summary?: string;
    endedReason?: string;
    artifact?: {
      messages?: Array<{
        role?: string;
        message?: string;
        content?: string;
      }>;
      transcript?: string;
    };
  };
};

function verifyWebhookSecret(request: Request): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.warn("[vapi] VAPI_WEBHOOK_SECRET not configured");
    return false;
  }
  const header =
    request.headers.get("x-vapi-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toolResult(
  toolCallId: string,
  result: unknown,
  toolName?: string,
  parameters?: Record<string, unknown>
) {
  const enriched =
    toolName && parameters
      ? enrichToolResult(toolName, parameters, result)
      : result;
  return {
    toolCallId,
    result: JSON.stringify(enriched),
  };
}

function parseParameters(toolCall: ToolCall): Record<string, unknown> {
  const raw =
    toolCall.parameters ??
    toolCall.arguments ??
    toolCall.function?.arguments ??
    {};

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }

  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  return {};
}

function parseCallMetadata(call?: VapiCallPayload): Record<string, unknown> {
  if (!call?.metadata) return {};
  if (typeof call.metadata === "object" && !Array.isArray(call.metadata)) {
    return call.metadata as Record<string, unknown>;
  }
  if (typeof call.metadata === "string") {
    try {
      const parsed = JSON.parse(call.metadata) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

function isReviewCollectionCall(call?: VapiCallPayload): boolean {
  const metadata = parseCallMetadata(call);
  if (metadata.type === "review_collection") return true;
  const reviewAssistantId = process.env.VAPI_REVIEW_ASSISTANT_ID?.trim();
  if (reviewAssistantId && call?.assistantId === reviewAssistantId) return true;
  return false;
}

function mapVapiStatusToReviewCall(status: string): ReviewCallStatus | null {
  const normalized = status.toLowerCase();
  if (normalized.includes("ringing") || normalized.includes("in-progress")) {
    return "calling";
  }
  if (normalized.includes("no-answer") || normalized.includes("no_answer")) {
    return "no_answer";
  }
  if (normalized.includes("busy")) return "busy";
  if (normalized.includes("failed") || normalized.includes("error")) {
    return "failed";
  }
  return null;
}

function buildTranscriptFromArtifact(
  messages: Array<{ role?: string; message?: string; content?: string }>
): string {
  return messages
    .map((entry) => {
      const role = entry.role === "user" ? "Customer" : "Assistant";
      const text = (entry.message ?? entry.content ?? "").trim();
      if (!text) return "";
      return `${role}: ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

async function executeReviewTool(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  name: string,
  parameters: Record<string, unknown>,
  metadata: Record<string, unknown>
) {
  const reviewCallId = String(
    parameters.reviewCallId ?? metadata.reviewCallId ?? ""
  );
  const orderId = String(parameters.orderId ?? metadata.orderId ?? "");

  switch (name) {
    case "getOrderProductsForReview":
      return await ctx.runQuery(
        internal.vapi.reviewCallTools.getOrderProductsForReview,
        { reviewCallId, orderId }
      );
    case "createProductReview":
      return await ctx.runMutation(
        internal.vapi.reviewCallTools.createProductReview,
        {
          reviewCallId,
          orderId,
          productId: String(parameters.productId ?? ""),
          rating: Number(parameters.rating ?? 0),
          review: String(parameters.review ?? parameters.content ?? ""),
          recommendationScore:
            typeof parameters.recommendationScore === "number"
              ? parameters.recommendationScore
              : undefined,
        }
      );
    default:
      return { error: `Unknown review tool: ${name}` };
  }
}

async function executeTool(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  name: string,
  parameters: Record<string, unknown>,
  conversationId?: Id<"vapiConversations">
) {
  switch (name) {
    case "searchProducts": {
      await ctx.runMutation(internal.vapi.logging.incrementAnalytics, {
        field: "productSearches",
      });
      const query =
        typeof parameters.query === "string" ? parameters.query : undefined;
      const searchArgs = {
        query,
        categoryName:
          typeof parameters.categoryName === "string"
            ? parameters.categoryName
            : typeof parameters.category === "string"
              ? parameters.category
              : undefined,
        maxPrice:
          typeof parameters.maxPrice === "number"
            ? parameters.maxPrice
            : typeof parameters.maxBudget === "number"
              ? parameters.maxBudget
              : undefined,
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
      };

      const result = await ctx.runQuery(
        internal.vapi.tools.searchProducts,
        searchArgs
      );

      if (result.count === 0 && query?.trim()) {
        const hybrid = await ctx.runAction(
          internal.vapi.voiceSearchActions.searchProductsHybrid,
          {
            query: query.trim(),
            budget: searchArgs.maxPrice,
            limit: searchArgs.limit,
          }
        );

        if (hybrid.totalCount > 0) {
          return {
            products: hybrid.products,
            count: hybrid.totalCount,
            searchMethod: "hybrid" as const,
          };
        }
      }

      return result;
    }
    case "getProductDetails": {
      const productId = await resolveVoiceProductReference(ctx, parameters);
      if (!productId) {
        return {
          error:
            "Product not found. Search the catalog first, then use the product ID from results.",
        };
      }
      const details = await ctx.runQuery(internal.vapi.tools.getProductDetails, {
        productId,
        now: Date.now(),
      });
      if (!details) {
        return { error: "Product not found or unavailable." };
      }
      return details;
    }
    case "getProductReviews": {
      const productId = await resolveVoiceProductReference(ctx, parameters);
      if (!productId) {
        return { error: "Product not found. Search the catalog first." };
      }
      return await ctx.runQuery(internal.vapi.tools.getProductReviews, {
        productId,
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
        sort:
          parameters.sort === "recent" ||
          parameters.sort === "highest" ||
          parameters.sort === "lowest" ||
          parameters.sort === "helpful"
            ? parameters.sort
            : undefined,
      });
    }
    case "getBestSellers":
      return await ctx.runQuery(internal.vapi.tools.getBestSellers, {
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
      });
    case "getPaymentMethods":
      return await ctx.runQuery(internal.vapi.tools.getPaymentMethods, {});
    case "getShoppingGuide":
      return await ctx.runQuery(internal.vapi.tools.getShoppingGuide, {
        topic:
          typeof parameters.topic === "string" ? parameters.topic : undefined,
      });
    case "recommendProducts":
      return await ctx.runQuery(internal.vapi.tools.recommendProducts, {
        category:
          typeof parameters.category === "string" ? parameters.category : undefined,
        maxBudget:
          typeof parameters.maxBudget === "number" ? parameters.maxBudget : undefined,
        preference:
          typeof parameters.preference === "string"
            ? parameters.preference
            : undefined,
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
      });
    case "getCategories":
      return await ctx.runQuery(internal.vapi.tools.getCategories, {});
    case "trackOrder":
      return await ctx.runMutation(internal.vapi.tools.trackOrder, {
        orderNumber: String(parameters.orderNumber ?? ""),
      });
    case "getOrdersByEmail":
      return await ctx.runMutation(internal.vapi.tools.getOrdersByEmail, {
        email: String(parameters.email ?? ""),
      });
    case "getStoreInfo":
      return await ctx.runQuery(internal.vapi.tools.getStoreInfo, {});
    case "getShippingPolicy":
      return await ctx.runQuery(internal.vapi.tools.getShippingPolicy, {});
    case "getReturnPolicy":
      return await ctx.runQuery(internal.vapi.tools.getReturnPolicy, {});
    case "createLead":
      return await ctx.runMutation(internal.vapi.tools.createLead, {
        name: String(parameters.name ?? ""),
        email: String(parameters.email ?? ""),
        phone:
          typeof parameters.phone === "string" ? parameters.phone : undefined,
        message: String(parameters.message ?? ""),
        conversationId,
      });
    case "createReview":
      return await ctx.runMutation(internal.vapi.tools.createReview, {
        orderNumber: String(parameters.orderNumber ?? ""),
        customerEmail: String(parameters.customerEmail ?? parameters.email ?? ""),
        productId: String(parameters.productId ?? ""),
        rating: Number(parameters.rating ?? 0),
        title: String(parameters.title ?? "Customer review"),
        content: String(parameters.content ?? parameters.review ?? ""),
      });
    case "requestHumanSupport":
      return await ctx.runMutation(internal.vapi.tools.requestHumanSupport, {
        name: String(parameters.name ?? ""),
        email: String(parameters.email ?? ""),
        phone:
          typeof parameters.phone === "string" ? parameters.phone : undefined,
        subject:
          typeof parameters.subject === "string" ? parameters.subject : undefined,
        conversationTranscript: String(
          parameters.conversationTranscript ??
            parameters.transcript ??
            parameters.message ??
            ""
        ),
        conversationId,
      });
    case "searchProductsHybrid": {
      await ctx.runMutation(internal.vapi.logging.incrementAnalytics, {
        field: "productSearches",
      });
      return await ctx.runAction(internal.vapi.voiceSearchActions.searchProductsHybrid, {
        query: String(parameters.query ?? ""),
        budget:
          typeof parameters.budget === "number"
            ? parameters.budget
            : typeof parameters.maxPrice === "number"
              ? parameters.maxPrice
              : undefined,
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
      });
    }
    case "buildProductBundle": {
      await ctx.runMutation(internal.vapi.logging.incrementAnalytics, {
        field: "productSearches",
      });
      return await ctx.runAction(internal.vapi.voiceSearchActions.buildProductBundle, {
        query: String(parameters.query ?? ""),
        budget:
          typeof parameters.budget === "number"
            ? parameters.budget
            : typeof parameters.maxBudget === "number"
              ? parameters.maxBudget
              : undefined,
      });
    }
    case "addToCart": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      try {
        if (Array.isArray(parameters.productIds)) {
          const resolvedIds = (
            await Promise.all(
              parameters.productIds.map(async (id) => {
                const reference = String(id ?? "").trim();
                if (!reference) return null;
                return await ctx.runQuery(
                  internal.vapi.shoppingTools.resolveProductIdForVoice,
                  { reference }
                );
              })
            )
          ).filter((id): id is Id<"products"> => id !== null);

          if (resolvedIds.length === 0) {
            return {
              error:
                "I couldn't match those items to in-stock products. Please pick from the latest search results.",
            };
          }

          return await ctx.runMutation(internal.vapi.shoppingTools.addMultipleToCart, {
            conversationId,
            productIds: resolvedIds,
          });
        }

        const resolvedProductId = await resolveVoiceProductReference(ctx, parameters);
        if (!resolvedProductId) {
          return {
            error:
              "I couldn't match that product to an in-stock item. Please choose a product from the search results.",
          };
        }

        return await ctx.runMutation(internal.vapi.shoppingTools.addToCart, {
          conversationId,
          productId: resolvedProductId,
          color: typeof parameters.color === "string" ? parameters.color : undefined,
          quantity:
            typeof parameters.quantity === "number" ? parameters.quantity : undefined,
        });
      } catch (error) {
        return { error: formatToolExecutionError(error) };
      }
    }
    case "getCart": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      return await ctx.runQuery(internal.vapi.shoppingTools.getCart, {
        conversationId,
        now: Date.now(),
        deliveryMethod: parseVoiceDeliveryMethod(parameters.deliveryMethod),
      });
    }
    case "getDeliveryOptions": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      return await ctx.runQuery(internal.vapi.shoppingTools.getDeliveryOptions, {
        conversationId,
        now: Date.now(),
        deliveryMethod: parseVoiceDeliveryMethod(parameters.deliveryMethod),
      });
    }
    case "getActivePromotions":
      return await ctx.runQuery(internal.vapi.promotionTools.getActivePromotions, {
        now: Date.now(),
        limit: typeof parameters.limit === "number" ? parameters.limit : undefined,
      });
    case "getPromotionsForProduct": {
      const productId = await resolveVoiceProductReference(ctx, parameters);
      if (!productId) {
        return { error: "Product not found. Search the catalog first." };
      }
      return await ctx.runQuery(internal.vapi.promotionTools.getPromotionsForProduct, {
        productId,
        now: Date.now(),
      });
    }
    case "removeFromCart": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      return await ctx.runMutation(internal.vapi.shoppingTools.removeFromCart, {
        conversationId,
        productId:
          typeof parameters.productId === "string"
            ? (parameters.productId as Id<"products">)
            : undefined,
        color: typeof parameters.color === "string" ? parameters.color : undefined,
        clearAll: parameters.clearAll === true,
      });
    }
    case "createCheckoutSession": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      return await ctx.runAction(internal.vapi.shoppingCheckoutActions.createCheckoutSession, {
        conversationId,
        customer: parseVoiceCustomer(parameters),
        idempotencyKey: buildVoiceIdempotencyKey(conversationId),
        deliveryMethod: parseVoiceDeliveryMethod(parameters.deliveryMethod),
      });
    }
    case "createCashOrder": {
      if (!conversationId) {
        return { error: "Voice cart session not ready. Please try again." };
      }
      return await ctx.runMutation(internal.vapi.shoppingTools.createCashOrder, {
        conversationId,
        customer: parseVoiceCustomer(parameters),
        idempotencyKey: buildVoiceIdempotencyKey(conversationId),
        deliveryMethod: parseVoiceDeliveryMethod(parameters.deliveryMethod),
      });
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function parseVoiceCustomer(parameters: Record<string, unknown>) {
  return {
    fullName: String(parameters.fullName ?? parameters.name ?? ""),
    email: String(parameters.email ?? ""),
    phone: String(parameters.phone ?? ""),
    address: String(parameters.address ?? ""),
    notes:
      typeof parameters.notes === "string" ? parameters.notes : undefined,
    termsAccepted: parameters.termsAccepted !== false,
    privacyAccepted: parameters.privacyAccepted !== false,
  };
}

function buildVoiceIdempotencyKey(conversationId: Id<"vapiConversations">) {
  return `vapi-${conversationId}-${Date.now()}`;
}

async function resolveVoiceProductReference(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  parameters: Record<string, unknown>
): Promise<Id<"products"> | null> {
  const reference = String(
    parameters.productId ??
      parameters.id ??
      parameters.productName ??
      parameters.name ??
      ""
  ).trim();
  if (!reference) return null;

  return await ctx.runQuery(internal.vapi.shoppingTools.resolveProductIdForVoice, {
    reference,
  });
}

function formatToolExecutionError(error: unknown): string {
  if (error instanceof ConvexError) {
    const data = error.data;
    if (typeof data === "string" && data.trim()) return data;
    return error.message;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unable to complete that store action. Please try again.";
}

export const vapiWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!verifyWebhookSecret(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: VapiWebhookBody;
  try {
    body = (await request.json()) as VapiWebhookBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = body.message;
  if (!message?.type) {
    return jsonResponse({ ok: true });
  }

  const call = message.call;
  const callId = call?.id ?? "unknown";
  const callMetadata = parseCallMetadata(call);
  const isReviewCall = isReviewCollectionCall(call);

  if (isReviewCall) {
    const reviewCallIdRaw = callMetadata.reviewCallId;
    const reviewCallId =
      typeof reviewCallIdRaw === "string" ? reviewCallIdRaw : undefined;

    if (message.type === "status-update" && message.status) {
      const mapped = mapVapiStatusToReviewCall(message.status);
      if (mapped) {
        await ctx.runMutation(internal.reviewCalls.updateCallStatus, {
          reviewCallId: reviewCallId as Id<"review_calls"> | undefined,
          vapiCallId: callId !== "unknown" ? callId : undefined,
          status: mapped,
          endedReason: message.status,
        });
      }
    }

    if (
      message.type === "transcript" &&
      message.transcript?.trim() &&
      message.transcriptType !== "partial"
    ) {
      const role =
        message.role === "user"
          ? "Customer"
          : message.role === "assistant"
            ? "Assistant"
            : "Speaker";
      await ctx.runMutation(internal.reviewCalls.saveCallTranscript, {
        reviewCallId: reviewCallId as Id<"review_calls"> | undefined,
        vapiCallId: callId !== "unknown" ? callId : undefined,
        transcript: `${role}: ${message.transcript.trim()}\n`,
        finalize: false,
      });
    }

    if (message.type === "tool-calls" && message.toolCallList?.length) {
      const results = [];

      for (const toolCall of message.toolCallList) {
        const parameters = parseParameters(toolCall);
        const toolName = toolCall.name ?? toolCall.function?.name ?? "unknown";
        try {
          const output = await executeReviewTool(
            ctx,
            toolName,
            parameters,
            callMetadata
          );
          results.push(toolResult(toolCall.id, output));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Tool execution failed";
          results.push(toolResult(toolCall.id, { error: errorMessage }));
        }
      }

      return jsonResponse({ results });
    }

    if (message.type === "end-of-call-report") {
      const artifactMessages = message.artifact?.messages ?? [];
      const transcript =
        message.artifact?.transcript?.trim() ||
        buildTranscriptFromArtifact(artifactMessages);

      await ctx.runMutation(internal.reviewCalls.saveCallTranscript, {
        reviewCallId: reviewCallId as Id<"review_calls"> | undefined,
        vapiCallId: callId !== "unknown" ? callId : undefined,
        transcript: transcript || "(No transcript captured)",
        summary: message.summary,
        endedReason: message.endedReason,
        finalize: true,
      });
    }

    return jsonResponse({ ok: true });
  }

  const channel =
    message.call?.type === "webCall" || message.call?.type === "inboundPhoneCall"
      ? ("voice" as const)
      : ("chat" as const);

  let conversationId: Id<"vapiConversations"> | undefined;

  const shouldTrackConversation =
    message.type === "tool-calls" ||
    message.type === "end-of-call-report" ||
    message.type === "status-update" ||
    message.type === "transcript";

  if (shouldTrackConversation) {
    const upsert = await ctx.runMutation(internal.vapi.logging.upsertConversation, {
      vapiCallId: callId,
      channel,
      summary: message.summary,
      ended: message.type === "end-of-call-report",
    });
    conversationId = upsert.conversationId;

    if (upsert.isNew) {
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role: "system",
        content:
          channel === "voice"
            ? "Voice session started."
            : "Chat session started.",
      });
    }
  }

  if (
    message.type === "transcript" &&
    conversationId &&
    message.transcript?.trim() &&
    message.transcriptType !== "partial"
  ) {
    const role =
      message.role === "user"
        ? ("user" as const)
        : message.role === "assistant"
          ? ("assistant" as const)
          : null;

    if (role) {
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role,
        content: message.transcript.trim(),
        dedupe: true,
      });
    }
  }

  if (message.type === "tool-calls" && message.toolCallList?.length) {
    const results = [];

    for (const toolCall of message.toolCallList) {
      const parameters = parseParameters(toolCall);
      const toolName = toolCall.name ?? toolCall.function?.name ?? "unknown";
      try {
        const output = await executeTool(
          ctx,
          toolName,
          parameters,
          conversationId
        );
        const enriched = enrichToolResult(toolName, parameters, output);
        results.push(toolResult(toolCall.id, enriched, toolName, parameters));

        if (conversationId) {
          await ctx.runMutation(internal.vapi.logging.appendLog, {
            conversationId,
            role: "tool",
            content: toolName,
            toolName,
            toolInput: JSON.stringify(parameters),
            toolOutput: JSON.stringify(enriched),
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Tool execution failed";
        results.push(
          toolResult(toolCall.id, { error: errorMessage })
        );
        if (conversationId) {
          await ctx.runMutation(internal.vapi.logging.appendLog, {
            conversationId,
            role: "tool",
            content: `${toolName} failed: ${errorMessage}`,
            toolName,
            toolInput: JSON.stringify(parameters),
            toolOutput: JSON.stringify({ error: errorMessage }),
          });
        }
      }
    }

    return jsonResponse({ results });
  }

  if (message.type === "knowledge-base-request") {
    const kb = await ctx.runQuery(internal.vapi.tools.getKnowledgeBase, {
      query: message.transcript,
    });
    return jsonResponse(kb);
  }

  if (message.type === "end-of-call-report" && conversationId) {
    const messages = message.artifact?.messages ?? [];
    for (const entry of messages) {
      const role = entry.role === "user" ? "user" : "assistant";
      const content = entry.message ?? entry.content ?? "";
      if (!content.trim()) continue;
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role,
        content,
        dedupe: true,
      });
    }

    if (message.summary) {
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role: "system",
        content: `Session ended. Summary: ${message.summary}`,
        dedupe: true,
      });
    } else if (message.endedReason) {
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role: "system",
        content: `Session ended (${message.endedReason}).`,
        dedupe: true,
      });
    }
  }

  return jsonResponse({ ok: true });
});
