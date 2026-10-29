import { v } from "convex/values";
import { internalMutation, internalQuery } from "./server";
import { internal } from "./_generated/api";
import {
  buildStripeRefundIdempotencyKey,
  planStripeRefundRetry,
  STRIPE_REFUND_LEASE_MS,
} from "./lib/stripeRefundRetry";

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
      leaseVersion: v.number(),
      stripeRefundId: v.optional(v.string()),
      stripeRefundedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.status === "succeeded") return null;
    const now = Date.now();
    if (attempt.status === "pending" && attempt.nextAttemptAt > now) return null;
    if (
      attempt.status === "processing" &&
      (attempt.leaseVersion == null
        ? attempt.updatedAt + STRIPE_REFUND_LEASE_MS
        : attempt.nextAttemptAt) > now
    ) {
      return null;
    }
    const leaseVersion = (attempt.leaseVersion ?? 0) + 1;
    await ctx.db.patch(attempt._id, {
      status: "processing",
      leaseVersion,
      nextAttemptAt: now + STRIPE_REFUND_LEASE_MS,
      updatedAt: now,
    });
    return {
      orderId: attempt.orderId,
      paymentIntentId: attempt.paymentIntentId,
      amountCents: attempt.amountCents,
      reason: attempt.reason,
      feePercent: attempt.feePercent,
      idempotencyKey: attempt.idempotencyKey,
      leaseVersion,
      stripeRefundId: attempt.stripeRefundId,
      stripeRefundedAt: attempt.stripeRefundedAt,
    };
  },
});

/** Persist Stripe's outcome before reconciling the order, so a retry need not refund again. */
export const recordStripeRefundResult = internalMutation({
  args: {
    attemptId: v.id("stripeRefundAttempts"),
    leaseVersion: v.number(),
    stripeRefundId: v.optional(v.string()),
    refunded: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (
      !attempt ||
      attempt.status !== "processing" ||
      attempt.leaseVersion !== args.leaseVersion
    ) return false;
    await ctx.db.patch(attempt._id, {
      stripeRefundId: args.stripeRefundId ?? attempt.stripeRefundId,
      stripeRefundedAt: args.refunded
        ? attempt.stripeRefundedAt ?? Date.now()
        : attempt.stripeRefundedAt,
      updatedAt: Date.now(),
    });
    return true;
  },
});

/** The nested mutation and job completion share one transaction and roll back together. */
export const completeStripeRefundAttempt = internalMutation({
  args: {
    attemptId: v.id("stripeRefundAttempts"),
    leaseVersion: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (
      !attempt ||
      attempt.status !== "processing" ||
      attempt.leaseVersion !== args.leaseVersion ||
      attempt.stripeRefundedAt == null
    ) return false;
    await ctx.runMutation(internal.orders.markOrderRefunded, {
      orderId: attempt.orderId,
      stripePaymentIntentId: attempt.paymentIntentId,
    });
    await ctx.db.patch(attempt._id, {
      status: "succeeded",
      lastError: undefined,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const deferStripeRefundAttempt = internalMutation({
  args: {
    attemptId: v.id("stripeRefundAttempts"),
    leaseVersion: v.number(),
    message: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (
      !attempt ||
      attempt.status !== "processing" ||
      attempt.leaseVersion !== args.leaseVersion
    ) return false;
    const attempts = attempt.attempts + 1;
    const now = Date.now();
    await ctx.db.patch(attempt._id, {
      status: "pending",
      attempts,
      nextAttemptAt: planStripeRefundRetry(attempts, now),
      lastError: args.message.slice(0, 400),
      updatedAt: now,
    });
    return true;
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
    const [pending, interrupted] = await Promise.all([
      ctx.db
        .query("stripeRefundAttempts")
        .withIndex("by_status_next", (q) =>
          q.eq("status", "pending").lte("nextAttemptAt", args.now)
        )
        .take(10),
      ctx.db
        .query("stripeRefundAttempts")
        .withIndex("by_status_next", (q) =>
          q.eq("status", "processing").lte("nextAttemptAt", args.now)
        )
        .take(10),
    ]);
    return [...interrupted, ...pending].map((attempt) => attempt._id);
  },
});
