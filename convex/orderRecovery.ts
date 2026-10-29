import { action, internalMutation } from "./server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { secureToken, tokenHash } from "./lib/capabilities";
import { checkAndIncrementRateLimit } from "./lib/rateLimit";
export const requestAccess = action({
  args: { email: v.string(), orderNumber: v.string() },
  handler: async (ctx, args): Promise<{ challenge: string }> => {
    const email = args.email.trim().toLowerCase();
    const challenge = secureToken();
    // 128-bit emailed code, not a short guessable number. Never log or return the code.
    const code = secureToken().slice(0, 32);
    const accepted = await ctx.runMutation(internal.orderRecovery.createChallenge, {
      email, orderNumber: args.orderNumber.trim(), challengeHash: await tokenHash(challenge), otpHash: await tokenHash(code),
    });
    if (accepted) {
      try { await ctx.runAction(internal.email.sendOtpEmail, { email, otp: code, type: "order-recovery" }); } catch { /* Generic response; no code/error leakage. */ }
    }
    return { challenge };
  },
});
export const createChallenge = internalMutation({
  args: { email: v.string(), orderNumber: v.string(), challengeHash: v.string(), otpHash: v.string() },
  handler: async (ctx, args) => {
    if (args.email.length > 254 || args.orderNumber.length > 100) return false;
    for (const bucket of ["recovery:global", `recovery:${args.email}`]) {
      const q = await checkAndIncrementRateLimit(ctx, bucket, { maxAttempts: bucket === "recovery:global" ? 100 : 3, windowMs: 15 * 60_000 });
      if (!q.allowed) return false;
    }
    const order = await ctx.db.query("orders").withIndex("by_order_number", q => q.eq("orderNumber", args.orderNumber)).unique();
    if (!order || order.customerEmail.trim().toLowerCase() !== args.email) return false;
    await ctx.db.insert("orderRecoveryChallenges", { ...args, expiresAt: Date.now() + 10 * 60_000, attempts: 0, consumed: false });
    return true;
  },
});
export const verify = action({
  args: { challenge: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<{ orderNumber: string; accessToken: string } | null> => {
    if (args.challenge.length !== 64 || args.code.length > 64) return null;
    return ctx.runMutation(internal.orderRecovery.consume, { challengeHash: await tokenHash(args.challenge), otpHash: await tokenHash(args.code.trim()) });
  },
});
export const consume = internalMutation({
  args: { challengeHash: v.string(), otpHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db.query("orderRecoveryChallenges").withIndex("by_challenge", q => q.eq("challengeHash", args.challengeHash)).unique();
    if (!row || row.consumed || row.expiresAt <= Date.now() || row.attempts >= 5) return null;
    await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
    if (row.otpHash !== args.otpHash) return null;
    const order = await ctx.db.query("orders").withIndex("by_order_number", q => q.eq("orderNumber", row.orderNumber)).unique();
    if (!order || order.customerEmail.trim().toLowerCase() !== row.email) return null;
    await ctx.db.patch(row._id, { consumed: true });
    const accessToken = secureToken();
    await ctx.db.patch(order._id, { accessToken });
    return { orderNumber: order.orderNumber, accessToken };
  },
});
