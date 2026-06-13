import { httpAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

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

type VapiWebhookBody = {
  message?: {
    type?: string;
    call?: {
      id?: string;
      type?: string;
    };
    toolCallList?: ToolCall[];
    transcript?: string;
    summary?: string;
    endedReason?: string;
    artifact?: {
      messages?: Array<{
        role?: string;
        message?: string;
        content?: string;
      }>;
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

function toolResult(toolCallId: string, result: unknown) {
  return {
    toolCallId,
    result: JSON.stringify(result),
  };
}

function parseParameters(toolCall: ToolCall) {
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
  }

  return raw ?? {};
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
      return await ctx.runQuery(internal.vapi.tools.searchProducts, {
        query: typeof parameters.query === "string" ? parameters.query : undefined,
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
      });
    }
    case "getProductDetails":
      return await ctx.runQuery(internal.vapi.tools.getProductDetails, {
        productId: String(parameters.productId ?? parameters.id ?? ""),
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
    default:
      return { error: `Unknown tool: ${name}` };
  }
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

  const callId = message.call?.id ?? "unknown";
  const channel =
    message.call?.type === "webCall" || message.call?.type === "inboundPhoneCall"
      ? ("voice" as const)
      : ("chat" as const);

  let conversationId: Id<"vapiConversations"> | undefined;

  if (
    message.type === "tool-calls" ||
    message.type === "end-of-call-report" ||
    message.type === "status-update"
  ) {
    conversationId = await ctx.runMutation(internal.vapi.logging.upsertConversation, {
      vapiCallId: callId,
      channel,
      summary: message.summary,
      ended: message.type === "end-of-call-report",
    });
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
        results.push(toolResult(toolCall.id, output));

        if (conversationId) {
          await ctx.runMutation(internal.vapi.logging.appendLog, {
            conversationId,
            role: "tool",
            content: toolName,
            toolName,
            toolInput: JSON.stringify(parameters),
            toolOutput: JSON.stringify(output),
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Tool execution failed";
        results.push(
          toolResult(toolCall.id, { error: errorMessage })
        );
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
      });
    }

    if (message.summary) {
      await ctx.runMutation(internal.vapi.logging.appendLog, {
        conversationId,
        role: "assistant",
        content: `Call summary: ${message.summary}`,
      });
    }
  }

  return jsonResponse({ ok: true });
});
