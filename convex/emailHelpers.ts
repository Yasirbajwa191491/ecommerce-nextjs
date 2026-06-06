import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getProductForEmail = internalQuery({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

export const ensureSubscriberToken = internalMutation({
  args: {
    subscriberId: v.id("subscribers"),
    token: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriberId, {
      unsubscribeToken: args.token,
    });
  },
});
