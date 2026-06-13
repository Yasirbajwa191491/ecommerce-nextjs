import { parsePhoneNumberFromString } from "libphonenumber-js";
import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { getReviewByOrderProduct } from "./lib/reviews";
import {
  MAX_REVIEW_CALL_ATTEMPTS,
  RETRYABLE_REVIEW_CALL_STATUSES,
  reviewCallStatusValidator,
  type ReviewCallStatus,
} from "./lib/reviewCallValidators";

export function toE164Phone(phone: string): string | null {
  const parsed = parsePhoneNumberFromString(phone.trim());
  if (!parsed?.isValid()) return null;
  return parsed.format("E.164");
}

async function getCallsForOrder(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
  return await ctx.db
    .query("review_calls")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
}

async function orderHasReviewableProducts(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">
): Promise<boolean> {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();

  for (const item of items) {
    const existing = await getReviewByOrderProduct(ctx, orderId, item.productId);
    if (!existing) return true;
  }
  return false;
}

export async function computeCallEligibility(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">
) {
  const order = await ctx.db.get(orderId);
  if (!order) {
    return {
      canCall: false as const,
      reason: "Order not found",
      attemptCount: 0,
      latestStatus: null as ReviewCallStatus | null,
      canRetry: false,
    };
  }

  if (order.status !== "delivered") {
    return {
      canCall: false as const,
      reason: "Order must be delivered",
      attemptCount: 0,
      latestStatus: null as ReviewCallStatus | null,
      canRetry: false,
    };
  }

  if (!order.customerPhone?.trim()) {
    return {
      canCall: false as const,
      reason: "Customer phone number is missing",
      attemptCount: 0,
      latestStatus: null as ReviewCallStatus | null,
      canRetry: false,
    };
  }

  if (!toE164Phone(order.customerPhone)) {
    return {
      canCall: false as const,
      reason: "Customer phone number is invalid",
      attemptCount: 0,
      latestStatus: null as ReviewCallStatus | null,
      canRetry: false,
    };
  }

  const calls = await getCallsForOrder(ctx, orderId);
  const attemptCount = calls.length;
  const sorted = [...calls].sort((a, b) => b.createdAt - a.createdAt);
  const latest = sorted[0] ?? null;
  const latestStatus = latest?.status ?? null;

  if (calls.some((call) => call.status === "completed")) {
    return {
      canCall: false as const,
      reason: "Review call already completed",
      attemptCount,
      latestStatus,
      canRetry: false,
    };
  }

  if (calls.some((call) => call.status === "calling" || call.status === "pending")) {
    return {
      canCall: false as const,
      reason: "A review call is already in progress",
      attemptCount,
      latestStatus,
      canRetry: false,
    };
  }

  if (attemptCount >= MAX_REVIEW_CALL_ATTEMPTS) {
    return {
      canCall: false as const,
      reason: "Maximum call attempts reached (3)",
      attemptCount,
      latestStatus,
      canRetry: false,
    };
  }

  const hasReviewable = await orderHasReviewableProducts(ctx, orderId);
  if (!hasReviewable) {
    return {
      canCall: false as const,
      reason: "All products in this order already have reviews",
      attemptCount,
      latestStatus,
      canRetry: false,
    };
  }

  const canRetry =
    latest !== null && RETRYABLE_REVIEW_CALL_STATUSES.includes(latest.status);

  return {
    canCall: true as const,
    reason: canRetry ? "Retry available" : "Ready to call",
    attemptCount,
    latestStatus,
    canRetry,
  };
}

async function createReviewCallRecord(
  ctx: MutationCtx,
  args: {
    orderId: Id<"orders">;
    initiatedByAdminId?: string;
  }
) {
  const eligibility = await computeCallEligibility(ctx, args.orderId);
  if (!eligibility.canCall) {
    throw new ConvexError(eligibility.reason);
  }

  const order = await ctx.db.get(args.orderId);
  if (!order) throw new ConvexError("Order not found");

  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
    .collect();

  const productIds = items.map((item) => item.productId);
  const now = Date.now();

  const reviewCallId = await ctx.db.insert("review_calls", {
    orderId: args.orderId,
    customerName: order.customerName,
    customerPhone: order.customerPhone.trim(),
    status: "pending",
    initiatedByAdminId: args.initiatedByAdminId,
    attemptNumber: eligibility.attemptCount + 1,
    reviewsCollected: [],
    metadata: JSON.stringify({
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      productIds,
    }),
    createdAt: now,
  });

  await ctx.scheduler.runAfter(0, internal.reviewCallActions.placeOutboundCall, {
    reviewCallId,
  });

  return reviewCallId;
}

export const startReviewCall = mutation({
  args: { orderId: v.id("orders") },
  returns: v.id("review_calls"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await createReviewCallRecord(ctx, {
      orderId: args.orderId,
      initiatedByAdminId: admin._id,
    });
  },
});

export const retryReviewCall = mutation({
  args: { orderId: v.id("orders") },
  returns: v.id("review_calls"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const eligibility = await computeCallEligibility(ctx, args.orderId);
    if (!eligibility.canCall) {
      throw new ConvexError(eligibility.reason);
    }
    if (!eligibility.canRetry && eligibility.attemptCount > 0) {
      throw new ConvexError("No failed call to retry");
    }
    return await createReviewCallRecord(ctx, {
      orderId: args.orderId,
      initiatedByAdminId: admin._id,
    });
  },
});

export const getCallEligibility = query({
  args: { orderId: v.id("orders") },
  returns: v.object({
    canCall: v.boolean(),
    reason: v.string(),
    attemptCount: v.number(),
    latestStatus: v.union(reviewCallStatusValidator, v.null()),
    canRetry: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await computeCallEligibility(ctx, args.orderId);
  },
});

export const getByOrderId = query({
  args: { orderId: v.id("orders") },
  returns: v.object({
    latest: v.union(
      v.object({
        _id: v.id("review_calls"),
        status: reviewCallStatusValidator,
        attemptNumber: v.number(),
        startedAt: v.optional(v.number()),
        endedAt: v.optional(v.number()),
        duration: v.optional(v.number()),
        reviewsCollectedCount: v.number(),
        transcript: v.optional(v.string()),
        endedReason: v.optional(v.string()),
        createdAt: v.number(),
      }),
      v.null()
    ),
    history: v.array(
      v.object({
        _id: v.id("review_calls"),
        status: reviewCallStatusValidator,
        attemptNumber: v.number(),
        startedAt: v.optional(v.number()),
        duration: v.optional(v.number()),
        reviewsCollectedCount: v.number(),
        createdAt: v.number(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const calls = await getCallsForOrder(ctx, args.orderId);
    const sorted = [...calls].sort((a, b) => b.createdAt - a.createdAt);

    const mapSummary = (call: Doc<"review_calls">) => ({
      _id: call._id,
      status: call.status,
      attemptNumber: call.attemptNumber,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      duration: call.duration,
      reviewsCollectedCount: call.reviewsCollected.length,
      transcript: call.transcript,
      endedReason: call.endedReason,
      createdAt: call.createdAt,
    });

    const latest = sorted[0] ?? null;

    return {
      latest: latest
        ? {
            _id: latest._id,
            status: latest.status,
            attemptNumber: latest.attemptNumber,
            startedAt: latest.startedAt,
            endedAt: latest.endedAt,
            duration: latest.duration,
            reviewsCollectedCount: latest.reviewsCollected.length,
            transcript: latest.transcript,
            endedReason: latest.endedReason,
            createdAt: latest.createdAt,
          }
        : null,
      history: sorted.map((call) => ({
        _id: call._id,
        status: call.status,
        attemptNumber: call.attemptNumber,
        startedAt: call.startedAt,
        duration: call.duration,
        reviewsCollectedCount: call.reviewsCollected.length,
        createdAt: call.createdAt,
      })),
    };
  },
});

export const getById = query({
  args: { reviewCallId: v.id("review_calls") },
  returns: v.union(
    v.object({
      _id: v.id("review_calls"),
      orderId: v.id("orders"),
      orderNumber: v.string(),
      customerName: v.string(),
      customerPhone: v.string(),
      status: reviewCallStatusValidator,
      attemptNumber: v.number(),
      startedAt: v.optional(v.number()),
      endedAt: v.optional(v.number()),
      duration: v.optional(v.number()),
      transcript: v.optional(v.string()),
      reviewsCollected: v.array(
        v.object({
          productId: v.id("products"),
          reviewId: v.id("productReviews"),
          rating: v.number(),
          recommendationScore: v.optional(v.number()),
          productName: v.string(),
        })
      ),
      endedReason: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const call = await ctx.db.get(args.reviewCallId);
    if (!call) return null;

    const order = await ctx.db.get(call.orderId);
    const reviewsCollected = await Promise.all(
      call.reviewsCollected.map(async (entry) => {
        const product = await ctx.db.get(entry.productId);
        return {
          ...entry,
          productName: product?.name ?? "Product",
        };
      })
    );

    return {
      _id: call._id,
      orderId: call.orderId,
      orderNumber: order?.orderNumber ?? "—",
      customerName: call.customerName,
      customerPhone: call.customerPhone,
      status: call.status,
      attemptNumber: call.attemptNumber,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      duration: call.duration,
      transcript: call.transcript,
      reviewsCollected,
      endedReason: call.endedReason,
      createdAt: call.createdAt,
    };
  },
});

function filterReviewCalls(
  calls: Array<
    Doc<"review_calls"> & {
      orderNumber: string;
    }
  >,
  args: {
    status?: ReviewCallStatus;
    search?: string;
    orderNumber?: string;
    productId?: Id<"products">;
    dateFrom?: number;
    dateTo?: number;
  }
) {
  let filtered = calls;

  if (args.status) {
    filtered = filtered.filter((call) => call.status === args.status);
  }

  if (args.orderNumber?.trim()) {
    const term = args.orderNumber.trim().toLowerCase();
    filtered = filtered.filter((call) =>
      call.orderNumber.toLowerCase().includes(term)
    );
  }

  if (args.search?.trim()) {
    const term = args.search.trim().toLowerCase();
    const phoneTerm = args.search.replace(/\D/g, "");
    filtered = filtered.filter(
      (call) =>
        call.customerName.toLowerCase().includes(term) ||
        call.customerPhone.replace(/\D/g, "").includes(phoneTerm) ||
        call.orderNumber.toLowerCase().includes(term)
    );
  }

  if (args.productId) {
    filtered = filtered.filter((call) =>
      call.reviewsCollected.some((r) => r.productId === args.productId)
    );
  }

  if (args.dateFrom !== undefined) {
    filtered = filtered.filter((call) => call.createdAt >= args.dateFrom!);
  }

  if (args.dateTo !== undefined) {
    filtered = filtered.filter((call) => call.createdAt <= args.dateTo!);
  }

  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(reviewCallStatusValidator),
    search: v.optional(v.string()),
    orderNumber: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const allCalls = await ctx.db
      .query("review_calls")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    const orderIds = [...new Set(allCalls.map((c) => c.orderId))];
    const orderMap = new Map<Id<"orders">, Doc<"orders">>();
    for (const orderId of orderIds) {
      const order = await ctx.db.get(orderId);
      if (order) orderMap.set(orderId, order);
    }

    const enriched = allCalls.map((call) => ({
      ...call,
      orderNumber: orderMap.get(call.orderId)?.orderNumber ?? "—",
    }));

    const filtered = filterReviewCalls(enriched, args);
    const page = paginateArray(filtered, args.paginationOpts);

    return {
      ...page,
      page: page.page.map((call) => ({
        _id: call._id,
        orderId: call.orderId,
        orderNumber: call.orderNumber,
        customerName: call.customerName,
        customerPhone: call.customerPhone,
        status: call.status,
        attemptNumber: call.attemptNumber,
        duration: call.duration,
        reviewsCollectedCount: call.reviewsCollected.length,
        createdAt: call.createdAt,
        startedAt: call.startedAt,
      })),
    };
  },
});

export const getAnalytics = query({
  args: {
    dateFrom: v.optional(v.number()),
    dateTo: v.optional(v.number()),
  },
  returns: v.object({
    totalCalls: v.number(),
    completedCalls: v.number(),
    failedCalls: v.number(),
    noAnswerCalls: v.number(),
    reviewsCollected: v.number(),
    averageRating: v.number(),
    averageDurationMs: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let calls = await ctx.db.query("review_calls").collect();

    if (args.dateFrom !== undefined) {
      calls = calls.filter((call) => call.createdAt >= args.dateFrom!);
    }
    if (args.dateTo !== undefined) {
      calls = calls.filter((call) => call.createdAt <= args.dateTo!);
    }

    const totalCalls = calls.length;
    const completedCalls = calls.filter((c) => c.status === "completed").length;
    const failedCalls = calls.filter((c) => c.status === "failed").length;
    const noAnswerCalls = calls.filter((c) => c.status === "no_answer").length;

    const allRatings = calls.flatMap((c) =>
      c.reviewsCollected.map((r) => r.rating)
    );
    const reviewsCollected = allRatings.length;
    const averageRating =
      reviewsCollected === 0
        ? 0
        : Math.round(
            (allRatings.reduce((sum, r) => sum + r, 0) / reviewsCollected) * 10
          ) / 10;

    const durations = calls
      .map((c) => c.duration)
      .filter((d): d is number => d !== undefined && d > 0);
    const averageDurationMs =
      durations.length === 0
        ? 0
        : Math.round(
            durations.reduce((sum, d) => sum + d, 0) / durations.length
          );

    return {
      totalCalls,
      completedCalls,
      failedCalls,
      noAnswerCalls,
      reviewsCollected,
      averageRating,
      averageDurationMs,
    };
  },
});

export const getOutboundPayload = internalQuery({
  args: { reviewCallId: v.id("review_calls") },
  returns: v.union(
    v.object({
      reviewCallId: v.id("review_calls"),
      orderId: v.id("orders"),
      orderNumber: v.string(),
      customerName: v.string(),
      customerEmail: v.string(),
      customerPhoneE164: v.string(),
      productIds: v.array(v.id("products")),
      storeName: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.reviewCallId);
    if (!call || call.status !== "pending") return null;

    const order = await ctx.db.get(call.orderId);
    if (!order) return null;

    const e164 = toE164Phone(call.customerPhone);
    if (!e164) return null;

    let productIds: Id<"products">[] = [];
    if (call.metadata) {
      try {
        const parsed = JSON.parse(call.metadata) as { productIds?: string[] };
        productIds = (parsed.productIds ?? []) as Id<"products">[];
      } catch {
        productIds = [];
      }
    }

    if (productIds.length === 0) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order_id", (q) => q.eq("orderId", call.orderId))
        .collect();
      productIds = items.map((item) => item.productId);
    }

    const storeSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "email"))
      .unique();

    return {
      reviewCallId: call._id,
      orderId: call.orderId,
      orderNumber: order.orderNumber,
      customerName: call.customerName,
      customerEmail: order.customerEmail,
      customerPhoneE164: e164,
      productIds,
      storeName: storeSetting?.name ?? "Our Store",
    };
  },
});

export const linkVapiCallId = internalMutation({
  args: {
    reviewCallId: v.id("review_calls"),
    vapiCallId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.reviewCallId);
    if (!call) return null;

    const now = Date.now();
    await ctx.db.patch(args.reviewCallId, {
      vapiCallId: args.vapiCallId,
      status: "calling",
      startedAt: call.startedAt ?? now,
    });
    return null;
  },
});

export const markCallFailed = internalMutation({
  args: {
    reviewCallId: v.id("review_calls"),
    reason: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const call = await ctx.db.get(args.reviewCallId);
    if (!call) return null;
    if (call.status === "completed") return null;

    const now = Date.now();
    await ctx.db.patch(args.reviewCallId, {
      status: "failed",
      endedReason: args.reason,
      endedAt: now,
      duration:
        call.startedAt !== undefined ? now - call.startedAt : undefined,
    });
    return null;
  },
});

export const updateCallStatus = internalMutation({
  args: {
    reviewCallId: v.optional(v.id("review_calls")),
    vapiCallId: v.optional(v.string()),
    status: reviewCallStatusValidator,
    endedReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let call = args.reviewCallId
      ? await ctx.db.get(args.reviewCallId)
      : null;

    if (!call && args.vapiCallId) {
      call = await ctx.db
        .query("review_calls")
        .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId!))
        .unique();
    }

    if (!call) return null;
    if (call.status === "completed" || call.status === "failed") {
      return null;
    }

    const now = Date.now();
    const patch: Partial<Doc<"review_calls">> = { status: args.status };

    if (args.endedReason) patch.endedReason = args.endedReason;

    if (
      args.status === "calling" &&
      call.startedAt === undefined
    ) {
      patch.startedAt = now;
    }

    if (
      args.status === "completed" ||
      args.status === "failed" ||
      args.status === "no_answer" ||
      args.status === "busy" ||
      args.status === "cancelled"
    ) {
      patch.endedAt = now;
      const started = call.startedAt ?? patch.startedAt ?? call.createdAt;
      patch.duration = now - started;
    }

    await ctx.db.patch(call._id, patch);
    return null;
  },
});

export const saveCallTranscript = internalMutation({
  args: {
    reviewCallId: v.optional(v.id("review_calls")),
    vapiCallId: v.optional(v.string()),
    transcript: v.string(),
    summary: v.optional(v.string()),
    endedReason: v.optional(v.string()),
    finalize: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let call = args.reviewCallId
      ? await ctx.db.get(args.reviewCallId)
      : null;

    if (!call && args.vapiCallId) {
      call = await ctx.db
        .query("review_calls")
        .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", args.vapiCallId!))
        .unique();
    }

    if (!call) return null;

    const existingTranscript = call.transcript?.trim() ?? "";
    const incoming = args.transcript.trim();
    let transcript = existingTranscript
      ? `${existingTranscript}\n${incoming}`
      : incoming;

    const patch: Partial<Doc<"review_calls">> = { transcript };

    if (args.finalize) {
      if (args.summary?.trim()) {
        patch.transcript = `${transcript}\n\n[Summary] ${args.summary.trim()}`;
      }
      const now = Date.now();
      const hasReviews = call.reviewsCollected.length > 0;
      let finalStatus: ReviewCallStatus = hasReviews ? "completed" : "cancelled";

      if (args.endedReason) {
        const reason = args.endedReason.toLowerCase();
        if (reason.includes("no-answer") || reason.includes("no_answer")) {
          finalStatus = "no_answer";
        } else if (reason.includes("busy")) {
          finalStatus = "busy";
        } else if (reason.includes("failed") || reason.includes("error")) {
          finalStatus = "failed";
        } else if (!hasReviews && reason.includes("customer")) {
          finalStatus = "cancelled";
        } else if (hasReviews) {
          finalStatus = "completed";
        }
      }

      patch.status = finalStatus;
      patch.endedAt = now;
      patch.endedReason = args.endedReason ?? call.endedReason;
      const started = call.startedAt ?? call.createdAt;
      patch.duration = now - started;
    }

    await ctx.db.patch(call._id, patch);
    return null;
  },
});

export const scheduleAutoReviewCall = internalMutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const enabledRow = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_call_auto_enabled"))
      .unique();

    const enabled = (enabledRow?.value ?? "false").trim().toLowerCase() === "true";
    if (!enabled) return null;

    const eligibility = await computeCallEligibility(ctx, args.orderId);
    if (!eligibility.canCall) return null;

    await createReviewCallRecord(ctx, { orderId: args.orderId });
    return null;
  },
});
