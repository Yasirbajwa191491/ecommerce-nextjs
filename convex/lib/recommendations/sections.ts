import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { isProductActive } from "../productActive";
import { getPrimaryImageUrl } from "../productImages";
import type { Infer } from "convex/values";
import { recommendationSectionTypeValidator } from "./validators";

export type RecommendationSectionType = Infer<
  typeof recommendationSectionTypeValidator
>;

export type SectionContext = {
  productId?: Id<"products">;
  cartProductIds?: Id<"products">[];
  recentlyViewedProductIds?: Id<"products">[];
};

export async function getCoOccurrenceCandidates(
  ctx: QueryCtx,
  productIds: Id<"products">[],
  limit: number
): Promise<Map<string, number>> {
  const scores = new Map<string, number>();

  for (const productId of productIds) {
    const related = await ctx.db
      .query("productCoOccurrence")
      .withIndex("by_product_score", (q) => q.eq("productId", productId))
      .order("desc")
      .take(limit);

    for (const row of related) {
      const key = row.relatedProductId as string;
      scores.set(key, Math.max(scores.get(key) ?? 0, row.score));
    }
  }

  return scores;
}

export async function getTrendingProductIds(
  ctx: QueryCtx,
  _categoryIds: string[],
  limit: number
): Promise<Id<"products">[]> {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const events = await ctx.db
    .query("searchQueryEvents")
    .withIndex("by_searched_at", (q) => q.gte("searchedAt", since))
    .collect();

  if (events.length === 0) {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(limit);
    return products.filter(isProductActive).map((p) => p._id);
  }

  const products = await ctx.db.query("products").collect();
  const active = products
    .filter(isProductActive)
    .sort((a, b) => b.reviews - a.reviews || b.stars - a.stars)
    .slice(0, limit);

  return active.map((p) => p._id);
}

export async function getCandidateProductIds(
  ctx: QueryCtx,
  sectionType: RecommendationSectionType,
  profile: Doc<"customerRecommendationProfiles"> | null,
  context: SectionContext,
  limit: number
): Promise<Id<"products">[]> {
  const exclude = new Set<string>();
  if (context.productId) exclude.add(context.productId);

  const pushUnique = (
    ids: Id<"products">[],
    collector: Id<"products">[]
  ) => {
    for (const id of ids) {
      const key = id as string;
      if (exclude.has(key)) continue;
      if (!collector.includes(id)) collector.push(id);
      if (collector.length >= limit * 3) break;
    }
  };

  const candidates: Id<"products">[] = [];

  switch (sectionType) {
    case "recently_viewed":
      pushUnique(
        profile?.recentlyViewedProductIds ??
          context.recentlyViewedProductIds ??
          [],
        candidates
      );
      break;

    case "continue_shopping":
      pushUnique(context.cartProductIds ?? [], candidates);
      pushUnique(profile?.recentlyViewedProductIds ?? [], candidates);
      break;

    case "frequently_bought_together":
    case "complete_your_setup":
    case "customers_also_purchased":
    case "frequently_added":
      if (context.cartProductIds?.length || context.productId) {
        const anchors = [
          ...(context.cartProductIds ?? []),
          ...(context.productId ? [context.productId] : []),
        ];
        const coScores = await getCoOccurrenceCandidates(ctx, anchors, limit * 2);
        pushUnique(
          [...coScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id as Id<"products">),
          candidates
        );
      }
      break;

    case "because_you_bought":
      if (profile?.lastOrderAt) {
        const purchaseEvents = profile.identityType === "customer"
          ? await ctx.db
              .query("customerBehaviorEvents")
              .withIndex("by_customer_time", (q) =>
                q.eq("customerKey", profile.identityKey)
              )
              .order("desc")
              .take(20)
          : [];
        const purchasedIds = purchaseEvents
          .filter((event) => event.eventType === "purchase" && event.productId)
          .map((event) => event.productId!)
          .slice(0, 3);
        const coScores = await getCoOccurrenceCandidates(ctx, purchasedIds, limit * 2);
        pushUnique(
          [...coScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id as Id<"products">),
          candidates
        );
      }
      break;

    case "because_you_viewed":
      pushUnique(profile?.recentlyViewedProductIds ?? [], candidates);
      break;

    case "recommended_alternatives":
    case "ai_suggested_accessories":
    case "recommended_accessories":
    case "recommended_addons":
    case "last_minute":
      if (context.productId) {
        const product = await ctx.db.get(context.productId);
        if (product) {
          const categoryMatches = await ctx.db
            .query("products")
            .withIndex("by_category_id", (q) =>
              q.eq("categoryId", product.categoryId)
            )
            .take(limit * 2);
          pushUnique(
            categoryMatches
              .filter(isProductActive)
              .filter((p) => p._id !== context.productId)
              .map((p) => p._id),
            candidates
          );
        }
      }
      if (context.cartProductIds?.length) {
        const coScores = await getCoOccurrenceCandidates(
          ctx,
          context.cartProductIds,
          limit * 2
        );
        pushUnique(
          [...coScores.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id as Id<"products">),
          candidates
        );
      }
      break;

    case "customers_like_you_bought":
      if (profile?.segments.length) {
        const similarProfiles = await ctx.db
          .query("customerRecommendationProfiles")
          .withIndex("by_last_activity")
          .order("desc")
          .take(50);

        const productCounts = new Map<string, number>();
        for (const other of similarProfiles) {
          if (other._id === profile._id) continue;
          const shared = other.segments.filter((segment) =>
            profile.segments.includes(segment)
          );
          if (shared.length === 0) continue;
          for (const productId of other.recentlyViewedProductIds) {
            const key = productId as string;
            productCounts.set(key, (productCounts.get(key) ?? 0) + 1);
          }
        }
        pushUnique(
          [...productCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id]) => id as Id<"products">),
          candidates
        );
      }
      break;

    case "trending_in_interests": {
      const categoryIds = Object.keys(
        profile?.preferredCategoryIds
          ? JSON.parse(profile.preferredCategoryIds)
          : {}
      );
      pushUnique(await getTrendingProductIds(ctx, categoryIds, limit * 2), candidates);
      break;
    }

    case "recommended_for_you":
    case "ai_suggested":
    default:
      if (profile?.recentlyViewedProductIds.length) {
        pushUnique(profile.recentlyViewedProductIds, candidates);
      }
      break;
  }

  if (candidates.length < limit) {
    const featured = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(limit * 2);
    pushUnique(
      featured.filter(isProductActive).map((p) => p._id),
      candidates
    );
  }

  return candidates.slice(0, limit * 3);
}

export async function loadCandidateProducts(
  ctx: QueryCtx,
  productIds: Id<"products">[]
) {
  const products = [];
  for (const id of productIds) {
    const product = await ctx.db.get(id);
    if (product && isProductActive(product)) {
      const category = await ctx.db.get(product.categoryId);
      const intelligence = await ctx.db
        .query("productIntelligence")
        .withIndex("by_product", (q) => q.eq("productId", id))
        .unique();

      products.push({
        _id: product._id,
        name: product.name,
        company: product.company,
        price: product.price,
        discountPercent: product.discountPercent ?? 0,
        stars: product.stars,
        reviews: product.reviews,
        featured: product.featured,
        categoryId: product.categoryId,
        categoryName: category?.name ?? "Product",
        keywords: intelligence?.keywords ?? [],
        popularityScore:
          (product.featured ? 0.5 : 0) +
          Math.min(0.5, product.reviews / 100),
        imageUrl: getPrimaryImageUrl(product),
        embedding: product.embedding,
      });
    }
  }
  return products;
}
