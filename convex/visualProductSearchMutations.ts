import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation } from "./_generated/server";
import {
  buildTrackingBucketKey,
  checkAndIncrementRateLimit,
} from "./lib/rateLimit";

export const generateVisualSearchUploadUrl = mutation({
  args: { visitorId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim();
    if (!visitorId) {
      throw new ConvexError("Visitor id is required");
    }
    const rateLimit = await checkAndIncrementRateLimit(
      ctx,
      buildTrackingBucketKey("visual-upload", visitorId),
      { maxAttempts: 20, windowMs: 60 * 60 * 1000 }
    );
    if (!rateLimit.allowed) {
      throw new ConvexError("Too many image uploads. Please try again later.");
    }
    return await ctx.storage.generateUploadUrl();
  },
});
