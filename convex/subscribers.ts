import { paginationOptsValidator } from "convex/server";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin } from "./lib/requireAdmin";
import { paginateArray } from "./lib/pagination";
import { generateUnsubscribeToken } from "./lib/subscriberTokens";
import { insertAdminActivityLog } from "./lib/adminActivityLogs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

function filterSubscribersBySearch<
  T extends { email: string },
>(items: T[], search?: string) {
  if (!search?.trim()) return items;
  const term = search.trim().toLowerCase();
  return items.filter((s) => s.email.toLowerCase().includes(term));
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

      const token = existing.unsubscribeToken ?? generateUnsubscribeToken();
      await ctx.db.patch(existing._id, {
        active: true,
        subscribedAt: Date.now(),
        unsubscribedAt: undefined,
        source: args.source ?? existing.source ?? "footer",
        unsubscribeToken: token,
      });
      return { status: "resubscribed" as const };
    }

    await ctx.db.insert("subscribers", {
      email,
      active: true,
      subscribedAt: Date.now(),
      source: args.source ?? "footer",
      unsubscribeToken: generateUnsubscribeToken(),
    });

    return { status: "subscribed" as const };
  },
});

export const unsubscribeByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      throw new ConvexError("Invalid unsubscribe link.");
    }

    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_unsubscribe_token", (q) => q.eq("unsubscribeToken", token))
      .unique();

    if (!subscriber) {
      throw new ConvexError("This unsubscribe link is invalid or has expired.");
    }

    if (!subscriber.active) {
      return { status: "already_unsubscribed" as const, email: subscriber.email };
    }

    await ctx.db.patch(subscriber._id, {
      active: false,
      unsubscribedAt: Date.now(),
    });

    return { status: "unsubscribed" as const, email: subscriber.email };
  },
});

export const getByUnsubscribeToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) return null;

    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_unsubscribe_token", (q) => q.eq("unsubscribeToken", token))
      .unique();

    if (!subscriber) return null;

    return {
      email: subscriber.email,
      active: subscriber.active,
      subscribedAt: subscriber.subscribedAt,
    };
  },
});

/** Admin: list active newsletter subscribers for campaigns. */
export const listActive = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const subscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    const filtered = filterSubscribersBySearch(subscribers, args.search);
    return filtered.sort((a, b) => b.subscribedAt - a.subscribedAt);
  },
});

export const countByStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const subscribers = await ctx.db.query("subscribers").collect();
    return {
      subscribed: subscribers.filter((s) => s.active).length,
      unsubscribed: subscribers.filter((s) => !s.active).length,
      total: subscribers.length,
    };
  },
});

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(v.union(v.literal("subscribed"), v.literal("unsubscribed"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let subscribers = await ctx.db.query("subscribers").collect();

    if (args.status === "subscribed") {
      subscribers = subscribers.filter((s) => s.active);
    } else if (args.status === "unsubscribed") {
      subscribers = subscribers.filter((s) => !s.active);
    }

    subscribers = filterSubscribersBySearch(subscribers, args.search);
    subscribers.sort((a, b) => b.subscribedAt - a.subscribedAt);

    const { page, isDone, continueCursor } = paginateArray(
      subscribers,
      args.paginationOpts
    );

    return {
      page: page.map((s) => ({
        _id: s._id,
        email: s.email,
        active: s.active,
        status: s.active ? ("subscribed" as const) : ("unsubscribed" as const),
        subscribedAt: s.subscribedAt,
        unsubscribedAt: s.unsubscribedAt,
        source: s.source,
      })),
      isDone,
      continueCursor,
    };
  },
});

export const getById = query({
  args: { id: v.id("subscribers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const subscriber = await ctx.db.get(args.id);
    if (!subscriber) return null;

    const interestProfile = await ctx.db
      .query("subscriberInterestProfiles")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", args.id))
      .unique();

    return {
      ...subscriber,
      status: subscriber.active ? ("subscribed" as const) : ("unsubscribed" as const),
      interestProfile,
    };
  },
});

export const removeSubscriber = mutation({
  args: { id: v.id("subscribers") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const subscriber = await ctx.db.get(args.id);
    if (!subscriber) {
      throw new ConvexError("Subscriber not found.");
    }

    if (!subscriber.active) {
      return { status: "already_unsubscribed" as const };
    }

    await ctx.db.patch(args.id, {
      active: false,
      unsubscribedAt: Date.now(),
    });

    await insertAdminActivityLog(ctx, {
      type: "subscriber_removed",
      title: "Subscriber unsubscribed",
      description: `Admin removed ${subscriber.email} from newsletter list.`,
      actorType: "admin",
      actorUserId: admin._id,
      actorName: admin.name ?? admin.email,
      createdAt: Date.now(),
    });

    return { status: "removed" as const };
  },
});

export const listPaginatedInternal = internalQuery({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("subscribed"), v.literal("unsubscribed"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    let subscribers = await ctx.db.query("subscribers").collect();

    if (args.status === "subscribed") {
      subscribers = subscribers.filter((s) => s.active);
    } else if (args.status === "unsubscribed") {
      subscribers = subscribers.filter((s) => !s.active);
    }

    subscribers = filterSubscribersBySearch(subscribers, args.search);
    subscribers.sort((a, b) => b.subscribedAt - a.subscribedAt);

    const { page, isDone, continueCursor } = paginateArray(
      subscribers,
      args.paginationOpts
    );

    return {
      page: page.map((s) => ({
        email: s.email,
        status: s.active ? ("subscribed" as const) : ("unsubscribed" as const),
        subscribedAt: s.subscribedAt,
        unsubscribedAt: s.unsubscribedAt,
        source: s.source,
      })),
      isDone,
      continueCursor,
    };
  },
});

export const ensureSubscriberTokens = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db.query("subscribers").collect();
    let updated = 0;
    for (const subscriber of subscribers) {
      if (!subscriber.unsubscribeToken) {
        await ctx.db.patch(subscriber._id, {
          unsubscribeToken: generateUnsubscribeToken(),
        });
        updated += 1;
      }
    }
    return { updated };
  },
});

export const exportSubscribersCsv = mutation({
  args: {
    status: v.optional(
      v.union(v.literal("subscribed"), v.literal("unsubscribed"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let subscribers = await ctx.db.query("subscribers").collect();

    if (args.status === "subscribed") {
      subscribers = subscribers.filter((s) => s.active);
    } else if (args.status === "unsubscribed") {
      subscribers = subscribers.filter((s) => !s.active);
    }

    subscribers.sort((a, b) => b.subscribedAt - a.subscribedAt);

    const header = "Email,Status,Subscribed At,Unsubscribed At,Source";
    const rows = subscribers.map((s) =>
      [
        s.email,
        s.active ? "subscribed" : "unsubscribed",
        new Date(s.subscribedAt).toISOString(),
        s.unsubscribedAt ? new Date(s.unsubscribedAt).toISOString() : "",
        s.source ?? "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    );

    return `${header}\n${rows.join("\n")}`;
  },
});
