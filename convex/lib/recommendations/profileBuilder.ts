import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  computeCustomerInsights,
  computeInterestTagsFromPurchases,
  loadCustomerPurchases,
} from "../subscriberInterestDetection";
import {
  CUSTOMER_EMBEDDING_PROVIDER,
  CUSTOMER_EMBEDDING_VERSION,
  DEFAULT_SIGNAL_WEIGHTS,
  MAX_RECENTLY_VIEWED,
} from "./constants";
import { customerKeyFromEmail } from "./identity";
import type { customerBehaviorEventTypeValidator } from "./validators";
import type { Infer } from "convex/values";

type BehaviorEventType = Infer<typeof customerBehaviorEventTypeValidator>;

type AffinityMap = Record<string, number>;

function parseAffinityMap(raw?: string): AffinityMap {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const result: AffinityMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

function serializeAffinityMap(map: AffinityMap): string {
  return JSON.stringify(map);
}

function incrementAffinity(map: AffinityMap, key: string, amount: number): void {
  map[key] = (map[key] ?? 0) + amount;
}

function eventWeight(eventType: BehaviorEventType): number {
  switch (eventType) {
    case "purchase":
      return DEFAULT_SIGNAL_WEIGHTS.purchase;
    case "review":
      return DEFAULT_SIGNAL_WEIGHTS.review;
    case "cart_add":
      return DEFAULT_SIGNAL_WEIGHTS.cart_add;
    case "wishlist_add":
      return DEFAULT_SIGNAL_WEIGHTS.wishlist;
    case "voice_query":
    case "voice_recommendation":
      return DEFAULT_SIGNAL_WEIGHTS.voice;
    case "search":
      return DEFAULT_SIGNAL_WEIGHTS.search;
    case "view":
    default:
      return DEFAULT_SIGNAL_WEIGHTS.view;
  }
}

export async function getOrCreateProfile(
  ctx: MutationCtx,
  identityType: "visitor" | "customer",
  identityKey: string,
  email?: string
): Promise<Doc<"customerRecommendationProfiles">> {
  const existing = await ctx.db
    .query("customerRecommendationProfiles")
    .withIndex("by_identity", (q) =>
      q.eq("identityType", identityType).eq("identityKey", identityKey)
    )
    .unique();

  const now = Date.now();
  if (existing) {
    if (email && !existing.email) {
      await ctx.db.patch(existing._id, { email, updatedAt: now });
      return { ...existing, email };
    }
    return existing;
  }

  const id = await ctx.db.insert("customerRecommendationProfiles", {
    identityType,
    identityKey,
    email,
    orderCount: 0,
    totalSpent: 0,
    favoriteProductTypes: [],
    segments: [],
    interestTags: [],
    recentlyViewedProductIds: [],
    lastActivityAt: now,
    linkedVisitorIds: [],
    createdAt: now,
    updatedAt: now,
  });

  const created = await ctx.db.get(id);
  if (!created) throw new Error("Failed to create recommendation profile");
  return created;
}

export async function rebuildProfileFromSignals(
  ctx: MutationCtx,
  identityType: "visitor" | "customer",
  identityKey: string
): Promise<Id<"customerRecommendationProfiles">> {
  const profile = await getOrCreateProfile(ctx, identityType, identityKey);
  const now = Date.now();

  const events =
    identityType === "customer"
      ? await ctx.db
          .query("customerBehaviorEvents")
          .withIndex("by_customer_time", (q) => q.eq("customerKey", identityKey))
          .order("desc")
          .take(500)
      : await ctx.db
          .query("customerBehaviorEvents")
          .withIndex("by_visitor_time", (q) => q.eq("visitorId", identityKey))
          .order("desc")
          .take(500);

  const categoryAffinity = parseAffinityMap(profile.preferredCategoryIds);
  const brandAffinity = parseAffinityMap(profile.preferredBrands);
  const recentlyViewed: Id<"products">[] = [];
  const favoriteTypes = new Set<string>(profile.favoriteProductTypes);
  let priceMin = profile.priceRangeMin;
  let priceMax = profile.priceRangeMax;

  for (const event of events) {
    const weight = event.weight || eventWeight(event.eventType);
    if (event.productId) {
      const product = await ctx.db.get(event.productId);
      if (product) {
        incrementAffinity(categoryAffinity, product.categoryId, weight);
        incrementAffinity(brandAffinity, product.company.toLowerCase(), weight);
        const price = product.price;
        priceMin = priceMin === undefined ? price : Math.min(priceMin, price);
        priceMax = priceMax === undefined ? price : Math.max(priceMax, price);

        if (event.eventType === "view") {
          if (!recentlyViewed.includes(event.productId)) {
            recentlyViewed.push(event.productId);
          }
        }
      }
    }
  }

  const wishlist = await ctx.db
    .query("wishlistItems")
    .withIndex("by_identity_added", (q) =>
      q.eq("identityType", identityType).eq("identityKey", identityKey)
    )
    .order("desc")
    .take(50);

  for (const item of wishlist) {
    const product = await ctx.db.get(item.productId);
    if (product) {
      incrementAffinity(
        categoryAffinity,
        product.categoryId,
        DEFAULT_SIGNAL_WEIGHTS.wishlist
      );
      incrementAffinity(
        brandAffinity,
        product.company.toLowerCase(),
        DEFAULT_SIGNAL_WEIGHTS.wishlist
      );
    }
  }

  let orderCount = profile.orderCount;
  let totalSpent = profile.totalSpent;
  let lastOrderAt = profile.lastOrderAt;
  const interestTags = new Set<string>(profile.interestTags);
  const segments = new Set<string>(profile.segments);

  if (identityType === "customer" && identityKey.includes("@")) {
    const email = customerKeyFromEmail(identityKey);
    const purchaseItems = await loadCustomerPurchases(ctx, email);
    const tags = computeInterestTagsFromPurchases(purchaseItems);
    for (const tag of tags) interestTags.add(tag);

    const insights = await computeCustomerInsights(ctx, email, now);
    orderCount = insights.orderCount;
    totalSpent = insights.totalSpent;
    lastOrderAt = insights.lastOrderAt;
    for (const tag of insights.interestTags) interestTags.add(tag);

    const subscriberProfile = await ctx.db
      .query("subscriberInterestProfiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (subscriberProfile) {
      for (const tag of subscriberProfile.interestTags) interestTags.add(tag);
    }
  }

  for (const productId of recentlyViewed.slice(0, MAX_RECENTLY_VIEWED)) {
    const intelligence = await ctx.db
      .query("productIntelligence")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .unique();
    for (const keyword of intelligence?.keywords ?? []) {
      if (keyword.trim()) favoriteTypes.add(keyword.trim().toLowerCase());
    }
  }

  await ctx.db.patch(profile._id, {
    preferredCategoryIds: serializeAffinityMap(categoryAffinity),
    preferredBrands: serializeAffinityMap(brandAffinity),
    priceRangeMin: priceMin,
    priceRangeMax: priceMax,
    orderCount,
    totalSpent,
    lastOrderAt,
    favoriteProductTypes: Array.from(favoriteTypes).slice(0, 20),
    segments: Array.from(segments).slice(0, 20),
    interestTags: Array.from(interestTags).slice(0, 30),
    recentlyViewedProductIds: recentlyViewed.slice(0, MAX_RECENTLY_VIEWED),
    lastActivityAt: now,
    profileRefreshedAt: now,
    updatedAt: now,
  });

  return profile._id;
}

export async function computeCustomerEmbedding(
  ctx: QueryCtx | MutationCtx,
  profile: Doc<"customerRecommendationProfiles">
): Promise<number[] | null> {
  const events =
    profile.identityType === "customer"
      ? await ctx.db
          .query("customerBehaviorEvents")
          .withIndex("by_customer_time", (q) =>
            q.eq("customerKey", profile.identityKey)
          )
          .order("desc")
          .take(200)
      : await ctx.db
          .query("customerBehaviorEvents")
          .withIndex("by_visitor_time", (q) =>
            q.eq("visitorId", profile.identityKey)
          )
          .order("desc")
          .take(200);

  const wishlist = await ctx.db
    .query("wishlistItems")
    .withIndex("by_identity_added", (q) =>
      q
        .eq("identityType", profile.identityType)
        .eq("identityKey", profile.identityKey)
    )
    .order("desc")
    .take(50);

  const weightedProducts: Array<{ embedding: number[]; weight: number }> = [];

  for (const event of events) {
    if (!event.productId) continue;
    const product = await ctx.db.get(event.productId);
    if (!product?.embedding?.length) continue;
    weightedProducts.push({
      embedding: product.embedding,
      weight: event.weight || eventWeight(event.eventType),
    });
  }

  for (const item of wishlist) {
    const product = await ctx.db.get(item.productId);
    if (!product?.embedding?.length) continue;
    weightedProducts.push({
      embedding: product.embedding,
      weight: DEFAULT_SIGNAL_WEIGHTS.wishlist,
    });
  }

  if (weightedProducts.length === 0) return null;

  const dimensions = weightedProducts[0]!.embedding.length;
  const sum = new Array<number>(dimensions).fill(0);
  let totalWeight = 0;

  for (const item of weightedProducts) {
    if (item.embedding.length !== dimensions) continue;
    totalWeight += item.weight;
    for (let i = 0; i < dimensions; i++) {
      sum[i] += item.embedding[i]! * item.weight;
    }
  }

  if (totalWeight <= 0) return null;

  const vector = sum.map((value) => value / totalWeight);
  const magnitude = Math.sqrt(vector.reduce((acc, value) => acc + value * value, 0));
  if (magnitude <= 0) return null;
  return vector.map((value) => value / magnitude);
}

export async function applyCustomerEmbedding(
  ctx: MutationCtx,
  profileId: Id<"customerRecommendationProfiles">
): Promise<void> {
  const profile = await ctx.db.get(profileId);
  if (!profile) return;

  const embedding = await computeCustomerEmbedding(ctx, profile);
  if (!embedding) return;

  await ctx.db.patch(profileId, {
    embedding,
    embeddingProvider: CUSTOMER_EMBEDDING_PROVIDER,
    embeddingVersion: CUSTOMER_EMBEDDING_VERSION,
    embeddingUpdatedAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export function parseAffinityScores(raw?: string): AffinityMap {
  return parseAffinityMap(raw);
}

export async function mergeVisitorIntoCustomer(
  ctx: MutationCtx,
  visitorId: string,
  customerKey: string,
  email?: string
): Promise<void> {
  const visitorProfile = await ctx.db
    .query("customerRecommendationProfiles")
    .withIndex("by_identity", (q) =>
      q.eq("identityType", "visitor").eq("identityKey", visitorId)
    )
    .unique();

  const customerProfile = await getOrCreateProfile(
    ctx,
    "customer",
    customerKey,
    email
  );

  const visitorEvents = await ctx.db
    .query("customerBehaviorEvents")
    .withIndex("by_visitor_time", (q) => q.eq("visitorId", visitorId))
    .order("desc")
    .take(500);

  for (const event of visitorEvents) {
    if (!event.customerKey) {
      await ctx.db.patch(event._id, { customerKey });
    }
  }

  const linked = new Set(customerProfile.linkedVisitorIds);
  linked.add(visitorId);

  await ctx.db.patch(customerProfile._id, {
    linkedVisitorIds: Array.from(linked),
    email: email ?? customerProfile.email,
    updatedAt: Date.now(),
  });

  if (visitorProfile) {
    const mergedRecentlyViewed = [
      ...visitorProfile.recentlyViewedProductIds,
      ...customerProfile.recentlyViewedProductIds,
    ].filter((id, index, arr) => arr.indexOf(id) === index);

    await ctx.db.patch(customerProfile._id, {
      recentlyViewedProductIds: mergedRecentlyViewed.slice(0, MAX_RECENTLY_VIEWED),
    });
  }

  await rebuildProfileFromSignals(ctx, "customer", customerKey);
}
