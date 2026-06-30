import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import {
  productContentModeValidator,
  productContentJobStatusValidator,
} from "./lib/ai/productContentTypes";
import { requireAdmin } from "./lib/requireAdmin";
import {
  isProductContentN8nConfigured,
  isProductContentN8nEnabled,
} from "./lib/ai/featureFlags";

export const getN8nAvailability = query({
  args: {},
  returns: v.object({
    n8nAvailable: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return {
      n8nAvailable:
        isProductContentN8nEnabled() && isProductContentN8nConfigured(),
    };
  },
});

export const createJob = internalMutation({
  args: {
    requestId: v.string(),
    mode: productContentModeValidator,
    context: v.string(),
    triggeredBy: v.optional(v.string()),
  },
  returns: v.id("productContentJobs"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("productContentJobs", {
      requestId: args.requestId,
      mode: args.mode,
      context: args.context,
      status: "pending",
      triggeredBy: args.triggeredBy,
      createdAt: now,
    });
  },
});

export const getJobByRequestId = internalQuery({
  args: { requestId: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("productContentJobs"),
      requestId: v.string(),
      mode: productContentModeValidator,
      context: v.string(),
      status: productContentJobStatusValidator,
      result: v.optional(v.string()),
      error: v.optional(v.string()),
      provider: v.optional(v.string()),
      model: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("productContentJobs")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!job) return null;
    return {
      _id: job._id,
      requestId: job.requestId,
      mode: job.mode,
      context: job.context,
      status: job.status,
      result: job.result,
      error: job.error,
      provider: job.provider,
      model: job.model,
    };
  },
});

export const completeJob = internalMutation({
  args: {
    requestId: v.string(),
    result: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("productContentJobs")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!job) {
      throw new Error(`Product content job not found: ${args.requestId}`);
    }
    if (job.status !== "pending") {
      return null;
    }
    await ctx.db.patch(job._id, {
      status: "completed",
      result: args.result,
      provider: args.provider,
      model: args.model,
      completedAt: Date.now(),
    });
    return null;
  },
});

export const failJob = internalMutation({
  args: {
    requestId: v.string(),
    error: v.string(),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db
      .query("productContentJobs")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .unique();
    if (!job) {
      throw new Error(`Product content job not found: ${args.requestId}`);
    }
    if (job.status !== "pending") {
      return null;
    }
    await ctx.db.patch(job._id, {
      status: "failed",
      error: args.error,
      provider: args.provider,
      model: args.model,
      completedAt: Date.now(),
    });
    return null;
  },
});
