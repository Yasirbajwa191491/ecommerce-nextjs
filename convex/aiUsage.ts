import { mutation, internalMutation } from "./server";
import { v } from "convex/values";
import { requireGuest } from "./lib/guestIdentity";
import { checkAndIncrementRateLimit } from "./lib/rateLimit";
export const reserve = mutation({
  args: { guest: v.string(), service: v.union(v.literal("rag"), v.literal("vapi")) },
  handler: async (ctx, args) => {
    const owner = await requireGuest(ctx, args.guest);
    for (const [key, max, windowMs] of [[`ai:${args.service}:global`, 500, 86_400_000], [`ai:${args.service}:${owner}`, 30, 3_600_000]] as const) {
      const quota = await checkAndIncrementRateLimit(ctx, key, { maxAttempts: max, windowMs });
      if (!quota.allowed) throw new Error("AI usage limit reached");
    }
    return owner;
  },
});
export const reserveRag = internalMutation({
  args: { guest: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const owner = await requireGuest(ctx, args.guest);
    for (const [key, max, windowMs] of [["ai:rag:global", 500, 86_400_000], [`ai:rag:${owner}`, 30, 3_600_000]] as const) {
      const quota = await checkAndIncrementRateLimit(ctx, key, { maxAttempts: max, windowMs });
      if (!quota.allowed) throw new Error("AI usage limit reached");
    }
    return owner;
  },
});
