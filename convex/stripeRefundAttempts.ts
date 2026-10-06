import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { buildStripeRefundIdempotencyKey, planStripeRefundRetry } from "./lib/stripeRefundRetry";

export const enqueueStripeRefundAttempt = internalMutation({
  args: {
    orderId: v.id("orders"),
    paymentIntentId: v.string(),
    reason: v.string(),
    amountCents: v.optional(v.number()),
    feePercent: v.optional(v.number()),
  },
  returns: v.id("stripeRefundAttempts"),
  handler: async (ctx, args) => {
    const idempotencyKey = buildStripeRefundIdempotencyKey({
      orderId: args.orderId,
      paymentIntentId: args.paymentIntentId,
      amountCents: args.amountCents,
    });
    const existing = await ctx.db
      .query("stripeRefundAttempts")
      .withIndex("by_idempotency", (q) => q.eq("idempotencyKey", idempotencyKey))
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("stripeRefundAttempts", {
      orderId: args.orderId,
      paymentIntentId: args.paymentIntentId,
      amountCents: args.amountCents,
      reason: args.reason,
      feePercent: args.feePercent,
      idempotencyKey,
      status: "pending",
      attempts: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const claimStripeRefundAttempt = internalMutation({
  args: { attemptId: v.id("stripeRefundAttempts") },
  returns: v.union(
    v.object({
      orderId: v.id("orders"),
      paymentIntentId: v.string(),
      amountCents: v.optional(v.number()),
      reason: v.string(),
      feePercent: v.optional(v.number()),
      idempotencyKey: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status === "succeeded") return null;
    if (attempt.status === "processing" && Date.now() - attempt.updatedAt < 60_000) {
      return null;
    }
    await ctx.db.patch(attempt._id, {
      status: "processing",
      updatedAt: Date.now(),
    });
    return {
      orderId: attempt.orderId,
      paymentIntentId: attempt.paymentIntentId,
      amountCents: attempt.amountCents,
      reason: attempt.reason,
      feePercent: attempt.feePercent,
      idempotencyKey: attempt.idempotencyKey,
    };
  },
});

export const completeStripeRefundAttempt = internalMutation({
  args: { attemptId: v.id("stripeRefundAttempts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) return null;
    await ctx.db.patch(attempt._id, {
      status: "succeeded",
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const deferStripeRefundAttempt = internalMutation({
  args: {
    attemptId: v.id("stripeRefundAttempts"),
    message: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status === "succeeded") return null;
    const attempts = attempt.attempts + 1;
    const now = Date.now();
    await ctx.db.patch(attempt._id, {
      status: "pending",
      attempts,
      nextAttemptAt: planStripeRefundRetry(attempts, now),
      lastError: args.message.slice(0, 400),
      updatedAt: now,
    });
    return null;
  },
});

export const getStripeRefundAttempt = internalQuery({
  args: { attemptId: v.id("stripeRefundAttempts") },
  returns: v.union(
    v.object({
      orderId: v.id("orders"),
      paymentIntentId: v.string(),
      reason: v.string(),
      amountCents: v.optional(v.number()),
      feePercent: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status === "succeeded") return null;
    return {
      orderId: attempt.orderId,
      paymentIntentId: attempt.paymentIntentId,
      reason: attempt.reason,
      amountCents: attempt.amountCents,
      feePercent: attempt.feePercent,
    };
  },
});

export const listDueStripeRefunds = internalQuery({
  args: { now: v.number() },
  returns: v.array(v.id("stripeRefundAttempts")),
  handler: async (ctx, args) => {
    const due = await ctx.db
      .query("stripeRefundAttempts")
      .withIndex("by_status_next", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", args.now)
      )
      .take(20);
    return due.map((attempt) => attempt._id);
  },
});
