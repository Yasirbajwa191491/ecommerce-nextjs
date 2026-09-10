import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

const PURGE_BATCH_SIZE = 100;

export const purgeExpiredNotifications = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(PURGE_BATCH_SIZE);

    for (const notification of expired) {
      await ctx.db.delete(notification._id);
    }

    if (expired.length > 0) {
      console.info(`[notifications] purged ${expired.length} expired in-app notifications`);
    }

    return { deleted: expired.length };
  },
});
