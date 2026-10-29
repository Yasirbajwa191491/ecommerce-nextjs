import { mutation } from "./server";
import { secureToken, tokenHash } from "./lib/capabilities";
import { checkAndIncrementRateLimit } from "./lib/rateLimit";
export const issue = mutation({
  args: {},
  handler: async ctx => {
    const quota = await checkAndIncrementRateLimit(ctx, "guest-issuance:global", { maxAttempts: 500, windowMs: 60_000 });
    if (!quota.allowed) throw new Error("Please try again later");
    const token = secureToken();
    await ctx.db.insert("guestCapabilities", { tokenHash: await tokenHash(token), createdAt: Date.now() });
    return token;
  },
});
