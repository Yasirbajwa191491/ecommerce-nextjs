import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { requireAdmin } from "./lib/requireAdmin";
import {
  buildAllSegments,
  parseSegmentCriteria,
  type SegmentDefinition,
} from "./lib/emailSegments";
import {
  computeCustomerInsights,
  subscriberMatchesSegmentKey,
  upsertSubscriberInterestProfile,
} from "./lib/subscriberInterestDetection";

const BATCH_SIZE = 50;

export const listSegmentsWithCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();

    const segments = buildAllSegments(
      categories.map((c) => ({ name: c.name, slug: c.slug }))
    );

    const activeSubscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    const profiles = await ctx.db.query("subscriberInterestProfiles").collect();
    const profileBySubscriber = new Map(
      profiles.map((p) => [p.subscriberId, p])
    );

    const now = Date.now();

    const withCounts = segments.map((segment) => {
      let count = 0;
      if (segment.key === "all_subscribers") {
        count = activeSubscribers.length;
      } else {
        for (const subscriber of activeSubscribers) {
          const profile = profileBySubscriber.get(subscriber._id) ?? null;
          if (subscriberMatchesSegmentKey(profile, segment.key, now)) {
            count += 1;
          }
        }
      }
      return {
        key: segment.key,
        label: segment.label,
        description: segment.description,
        kind: segment.kind,
        count,
      };
    });

    return withCounts;
  },
});

export const countRecipientsForSegments = query({
  args: {
    segmentKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.segmentKeys.length === 0) return 0;

    const activeSubscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    const profiles = await ctx.db.query("subscriberInterestProfiles").collect();
    const profileBySubscriber = new Map(
      profiles.map((p) => [p.subscriberId, p])
    );

    const now = Date.now();
    const matched = new Set<string>();

    for (const subscriber of activeSubscribers) {
      const profile = profileBySubscriber.get(subscriber._id) ?? null;
      const matchesAny = args.segmentKeys.some((key) =>
        subscriberMatchesSegmentKey(profile, key, now)
      );
      if (matchesAny) {
        matched.add(subscriber._id);
      }
    }

    return matched.size;
  },
});

export const getProfileBySubscriberId = query({
  args: { subscriberId: v.id("subscribers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("subscriberInterestProfiles")
      .withIndex("by_subscriber", (q) => q.eq("subscriberId", args.subscriberId))
      .unique();
  },
});

export const scheduleRecomputeAll = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.subscriberInterests.recomputeAllBatch, {
      cursor: null,
    });
    return { scheduled: true as const };
  },
});

export const recomputeForEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const normalizedEmail = args.email.trim().toLowerCase();
    const now = Date.now();

    const subscriber = await ctx.db
      .query("subscribers")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (!subscriber) return;

    const insights = await computeCustomerInsights(ctx, normalizedEmail, now);
    await upsertSubscriberInterestProfile(
      ctx,
      subscriber._id,
      normalizedEmail,
      insights,
      now
    );
  },
});

export const recomputeAllBatch = internalMutation({
  args: { cursor: v.union(v.string(), v.null()) },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .paginate({ numItems: BATCH_SIZE, cursor: args.cursor });

    const now = Date.now();

    for (const subscriber of page.page) {
      const insights = await computeCustomerInsights(ctx, subscriber.email, now);
      await upsertSubscriberInterestProfile(
        ctx,
        subscriber._id,
        subscriber.email,
        insights,
        now
      );
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.subscriberInterests.recomputeAllBatch, {
        cursor: page.continueCursor,
      });
    }
  },
});

export const resolveSubscribersForSegmentKeys = internalQuery({
  args: { segmentKeys: v.array(v.string()) },
  handler: async (ctx, args) => {
    const activeSubscribers = await ctx.db
      .query("subscribers")
      .withIndex("by_active_subscribed", (q) => q.eq("active", true))
      .collect();

    const profiles = await ctx.db.query("subscriberInterestProfiles").collect();
    const profileBySubscriber = new Map(
      profiles.map((p) => [p.subscriberId, p])
    );

    const now = Date.now();
    const matchedIds = new Set<string>();

    for (const subscriber of activeSubscribers) {
      const profile = profileBySubscriber.get(subscriber._id) ?? null;
      const matchesAny = args.segmentKeys.some((key) =>
        subscriberMatchesSegmentKey(profile, key, now)
      );
      if (matchesAny) {
        matchedIds.add(subscriber._id);
      }
    }

    return activeSubscribers.filter((s) => matchedIds.has(s._id));
  },
});

export function getSegmentKeysFromCriteria(segmentCriteria?: string): string[] {
  const parsed = parseSegmentCriteria(segmentCriteria);
  return parsed?.segmentKeys ?? [];
}

export type { SegmentDefinition };
