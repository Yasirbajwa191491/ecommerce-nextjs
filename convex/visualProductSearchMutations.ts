import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const generateVisualSearchUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
