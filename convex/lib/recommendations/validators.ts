import { v } from "convex/values";

export const recommendationIdentityTypeValidator = v.union(
  v.literal("visitor"),
  v.literal("customer")
);

export const customerBehaviorEventTypeValidator = v.union(
  v.literal("view"),
  v.literal("search"),
  v.literal("cart_add"),
  v.literal("cart_remove"),
  v.literal("purchase"),
  v.literal("review"),
  v.literal("wishlist_add"),
  v.literal("wishlist_remove"),
  v.literal("voice_query"),
  v.literal("voice_recommendation")
);

export const recommendationSectionTypeValidator = v.union(
  v.literal("recommended_for_you"),
  v.literal("trending_in_interests"),
  v.literal("continue_shopping"),
  v.literal("recently_viewed"),
  v.literal("because_you_bought"),
  v.literal("because_you_viewed"),
  v.literal("ai_suggested"),
  v.literal("customers_like_you_bought"),
  v.literal("recommended_alternatives"),
  v.literal("ai_suggested_accessories"),
  v.literal("frequently_bought_together"),
  v.literal("complete_your_setup"),
  v.literal("customers_also_purchased"),
  v.literal("recommended_accessories"),
  v.literal("last_minute"),
  v.literal("frequently_added"),
  v.literal("recommended_addons")
);

export const recommendationJobTypeValidator = v.union(
  v.literal("profile_refresh"),
  v.literal("embedding_refresh"),
  v.literal("cache_refresh"),
  v.literal("co_occurrence_rebuild"),
  v.literal("analytics_rollup"),
  v.literal("ai_insights")
);

export const recommendationJobStatusValidator = v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("retry_scheduled"),
  v.literal("complete"),
  v.literal("failed")
);

export const recommendationInteractionTypeValidator = v.union(
  v.literal("impression"),
  v.literal("click"),
  v.literal("conversion")
);

export const recommendationSourceValidator = v.union(
  v.literal("personalized"),
  v.literal("similar"),
  v.literal("popular"),
  v.literal("featured"),
  v.literal("co_occurrence"),
  v.literal("ai"),
  v.literal("fallback")
);

export const recommendationResultItemValidator = v.object({
  productId: v.id("products"),
  score: v.number(),
  explanation: v.optional(v.string()),
});

export const recommendationResultValidator = v.object({
  products: v.array(recommendationResultItemValidator),
  sectionType: recommendationSectionTypeValidator,
  source: recommendationSourceValidator,
  cacheKey: v.optional(v.string()),
  cached: v.boolean(),
});

export const scoreMapValidator = v.record(v.string(), v.number());

export const recommendationSettingsReturnValidator = v.object({
  personalizationEnabled: v.boolean(),
  aiEnabled: v.boolean(),
  hybridEnabled: v.boolean(),
  n8nEnabled: v.boolean(),
  primaryProvider: v.string(),
  fallbackOrder: v.array(v.string()),
  refreshHours: v.number(),
  maxPerSection: v.number(),
  scoringWeights: v.object({
    customerInterest: v.number(),
    productSimilarity: v.number(),
    purchaseHistory: v.number(),
    popularity: v.number(),
    aiAdjustment: v.number(),
  }),
  fallbackStrategy: v.string(),
  cacheTtlMs: v.number(),
});

export const recommendationCacheReturnValidator = v.object({
  productIds: v.array(v.id("products")),
  scores: v.array(v.number()),
  source: recommendationSourceValidator,
});

export const customerRecommendationProfileReturnValidator = v.object({
  _id: v.id("customerRecommendationProfiles"),
  _creationTime: v.number(),
  identityType: recommendationIdentityTypeValidator,
  identityKey: v.string(),
  email: v.optional(v.string()),
  preferredCategoryIds: v.optional(v.string()),
  preferredBrands: v.optional(v.string()),
  priceRangeMin: v.optional(v.number()),
  priceRangeMax: v.optional(v.number()),
  purchaseFrequency: v.optional(v.number()),
  orderCount: v.number(),
  totalSpent: v.number(),
  lastOrderAt: v.optional(v.number()),
  favoriteProductTypes: v.array(v.string()),
  segments: v.array(v.string()),
  interestTags: v.array(v.string()),
  recentlyViewedProductIds: v.array(v.id("products")),
  recommendationScoreData: v.optional(v.string()),
  lastActivityAt: v.number(),
  profileRefreshedAt: v.optional(v.number()),
  aiInterestSummary: v.optional(v.string()),
  embedding: v.optional(v.array(v.float64())),
  embeddingProvider: v.optional(v.string()),
  embeddingVersion: v.optional(v.string()),
  embeddingUpdatedAt: v.optional(v.number()),
  linkedVisitorIds: v.array(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const sectionRecommendationReturnValidator = v.object({
  productIds: v.array(v.id("products")),
  scores: v.array(v.number()),
  source: v.string(),
  cacheKey: v.optional(v.string()),
});

export const marketingAudienceMemberValidator = v.object({
  email: v.optional(v.string()),
  identityKey: v.string(),
  segments: v.array(v.string()),
  interestTags: v.array(v.string()),
  orderCount: v.number(),
  totalSpent: v.number(),
  lastActivityAt: v.number(),
});

export const marketingAudienceExportValidator = v.object({
  exportedAt: v.number(),
  audienceCount: v.number(),
  audiences: v.array(marketingAudienceMemberValidator),
  segmentSummary: scoreMapValidator,
});
