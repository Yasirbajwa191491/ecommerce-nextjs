import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw new ConvexError("Please enter a valid email address.");
    }

    const existing = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      if (existing.active) {
        return { status: "already_subscribed" as const };
      }

      await ctx.db.patch(existing._id, {
        active: true,
        subscribedAt: Date.now(),
        source: args.source ?? existing.source ?? "footer",
      });
      return { status: "resubscribed" as const };
    }

    await ctx.db.insert("subscribers", {
      email,
      active: true,
      subscribedAt: Date.now(),
      source: args.source ?? "footer",
    });

    return { status: "subscribed" as const };
  },
});

/** Admin: list active newsletter subscribers for campaigns. */
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const subscribers = await ctx.db.query("subscribers").collect();
    return subscribers
      .filter((subscriber) => subscriber.active)
      .sort((a, b) => b.subscribedAt - a.subscribedAt);
  },
});
