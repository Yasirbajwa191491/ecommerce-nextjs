import { v } from "convex/values";
import { internalMutation, internalQuery } from "./server";

export const deactivateToken = internalMutation({
  args: {
    expoPushToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_expo_push_token", (q) =>
        q.eq("expoPushToken", args.expoPushToken.trim())
      )
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const getActiveTokensForEmail = internalQuery({
  args: {
    customerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const tokens = [];
    let cursor: string | null = null;
    do {
      const page = await ctx.db.query("pushTokens")
        .withIndex("by_customer_email_active", q => q.eq("customerEmail", args.customerEmail.trim().toLowerCase()).eq("isActive", true).eq("emailVerified", true))
        .paginate({ numItems: 25, cursor });
      tokens.push(...page.page.map(token => ({ _id: token._id, expoPushToken: token.expoPushToken, platform: token.platform, executionEnvironment: token.executionEnvironment })));
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);
    return tokens;
  },
});
