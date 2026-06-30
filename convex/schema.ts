import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  emailCampaignSegmentValidator,
  emailCampaignStatusValidator,
  emailRecipientStatusValidator,
  emailTemplateStatusValidator,
} from "./lib/emailMarketingValidators";
import {
  aiAnalysisStatusValidator,
  aiModerationValidator,
  aiSentimentValidator,
  productInsightsStatusValidator,
  reviewAiJobErrorCodeValidator,
  reviewAiJobStatusValidator,
  reviewAiJobTypeValidator,
  reviewAiGenerationModeValidator,
  reviewAiGenerationSourceValidator,
  reviewAiGenerationTypeValidator,
  reviewTopicValidator,
} from "./lib/aiValidators";
import {
  orderStatusLogActorValidator,
  orderStatusValidator,
  paymentLogActorValidator,
  paymentMethodValidator,
  paymentStatusValidator,
} from "./lib/orderValidators";
import {
  reviewCallStatusValidator,
  reviewCollectedEntryValidator,
} from "./lib/reviewCallValidators";
import {
  deliveryMethodTypeValidator,
  deliveryOptionValidator,
  warrantyDurationValidator,
  warrantyTypeValidator,
} from "./lib/productValidators";
import {
  productContentModeValidator,
  productContentJobStatusValidator,
} from "./lib/ai/productContentTypes";
import {
  customerBehaviorEventTypeValidator,
  recommendationIdentityTypeValidator,
  recommendationInteractionTypeValidator,
  recommendationJobStatusValidator,
  recommendationJobTypeValidator,
  recommendationSectionTypeValidator,
  recommendationSourceValidator,
} from "./lib/recommendations/validators";

export const productImageValidator = v.object({
  url: v.string(),
  alt: v.optional(v.string()),
});

export default defineSchema({
  productCategories: defineTable({
    name: v.string(),
    description: v.string(),
    slug: v.string(),
    active: v.boolean(),
    sortOrder: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_sort_order", ["sortOrder"])
    .index("by_active_sort", ["active", "sortOrder"]),

  products: defineTable({
    name: v.string(),
    company: v.string(),
    price: v.number(),
    currency: v.optional(v.string()),
    sku: v.optional(v.string()),
    colors: v.array(v.string()),
    image: v.array(productImageValidator),
    primaryImageIndex: v.optional(v.number()),
    categoryId: v.id("productCategories"),
    featured: v.boolean(),
    shipping: v.boolean(),
    discountPercent: v.optional(v.number()),
    shippingCharges: v.optional(v.number()),
    stock: v.number(),
    reviews: v.number(),
    stars: v.number(),
    description: v.string(),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    seoKeywords: v.optional(v.array(v.string())),
    highlights: v.optional(v.array(v.string())),
    active: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    embeddingStatus: v.optional(aiAnalysisStatusValidator),
    embeddingContentHash: v.optional(v.string()),
    embeddingUpdatedAt: v.optional(v.number()),
    imageEmbedding: v.optional(v.array(v.float64())),
    imageEmbeddingClip: v.optional(v.array(v.float64())),
    imageEmbeddingProvider: v.optional(v.string()),
    imageEmbeddingVersion: v.optional(v.string()),
    imageEmbeddingUpdatedAt: v.optional(v.number()),
    imageEmbeddingContentHash: v.optional(v.string()),
    imageEmbeddingStatus: v.optional(aiAnalysisStatusValidator),
    warrantyAvailable: v.optional(v.boolean()),
    warrantyDuration: v.optional(warrantyDurationValidator),
    warrantyType: v.optional(warrantyTypeValidator),
    warrantyDetails: v.optional(v.string()),
    deliveryOptions: v.optional(v.array(deliveryOptionValidator)),
  })
    .index("by_sort_order", ["sortOrder"])
    .index("by_category_id", ["categoryId"])
    .index("by_featured", ["featured"])
    .index("by_active_sort", ["active", "sortOrder"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["active"],
    })
    .vectorIndex("by_image_embedding", {
      vectorField: "imageEmbedding",
      dimensions: 768,
      filterFields: ["active"],
    })
    .vectorIndex("by_image_embedding_clip", {
      vectorField: "imageEmbeddingClip",
      dimensions: 512,
      filterFields: ["active"],
    }),

  productContentJobs: defineTable({
    requestId: v.string(),
    mode: productContentModeValidator,
    context: v.string(),
    status: productContentJobStatusValidator,
    result: v.optional(v.string()),
    error: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    triggeredBy: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_request_id", ["requestId"])
    .index("by_status_created", ["status", "createdAt"]),

  productIntelligence: defineTable({
    productId: v.id("products"),
    summary: v.string(),
    keywords: v.array(v.string()),
    useCases: v.array(v.string()),
    highlights: v.array(v.string()),
    reviewHighlights: v.array(v.string()),
    contentHash: v.string(),
    generatedAt: v.number(),
    aiStatus: productInsightsStatusValidator,
  }).index("by_product", ["productId"]),

  searchQueryEvents: defineTable({
    queryNormalized: v.string(),
    queryDisplay: v.string(),
    searchedAt: v.number(),
    resultCount: v.number(),
    sessionId: v.optional(v.string()),
    visitorId: v.optional(v.string()),
    customerKey: v.optional(v.string()),
    source: v.union(v.literal("header"), v.literal("catalog")),
  })
    .index("by_searched_at", ["searchedAt"])
    .index("by_query_normalized_time", ["queryNormalized", "searchedAt"])
    .index("by_visitor_searched_at", ["visitorId", "searchedAt"]),

  searchEmbeddingCache: defineTable({
    queryNormalized: v.string(),
    embedding: v.array(v.float64()),
    createdAt: v.number(),
  }).index("by_query_normalized", ["queryNormalized"]),

  visualSearchImageCache: defineTable({
    imageHash: v.string(),
    embedding: v.array(v.float64()),
    provider: v.string(),
    dimensions: v.number(),
    createdAt: v.number(),
  }).index("by_image_hash", ["imageHash"]),

  visualSearchEvents: defineTable({
    sessionId: v.optional(v.string()),
    provider: v.string(),
    resultCount: v.number(),
    fallbackUsed: v.optional(v.string()),
    searchedAt: v.number(),
    source: v.optional(v.union(v.literal("header"), v.literal("catalog"), v.literal("visual"))),
    textQuery: v.optional(v.string()),
    imageHash: v.optional(v.string()),
    topProductIds: v.optional(v.array(v.id("products"))),
  }).index("by_searched_at", ["searchedAt"]),

  imageEmbeddingJobs: defineTable({
    productId: v.id("products"),
    status: aiAnalysisStatusValidator,
    attempts: v.number(),
    maxAttempts: v.number(),
    provider: v.optional(v.string()),
    error: v.optional(v.string()),
    triggeredBy: v.optional(v.string()),
    idempotencyKey: v.string(),
    nextRetryAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_product_id", ["productId"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_status_next_retry", ["status", "nextRetryAt"])
    .index("by_idempotency", ["idempotencyKey"]),

  providerHealth: defineTable({
    provider: v.string(),
    status: v.union(v.literal("healthy"), v.literal("degraded"), v.literal("down")),
    lastSuccessAt: v.optional(v.number()),
    lastFailureAt: v.optional(v.number()),
    failureCount: v.number(),
    consecutiveFailures: v.number(),
    updatedAt: v.number(),
  }).index("by_provider", ["provider"]),

  subscribers: defineTable({
    email: v.string(),
    active: v.boolean(),
    subscribedAt: v.number(),
    source: v.optional(v.string()),
    unsubscribedAt: v.optional(v.number()),
    unsubscribeToken: v.optional(v.string()),
  })
    .index("by_email", ["email"])
    .index("by_unsubscribe_token", ["unsubscribeToken"])
    .index("by_active_subscribed", ["active", "subscribedAt"]),

  emailTemplates: defineTable({
    name: v.string(),
    subject: v.string(),
    headline: v.optional(v.string()),
    previewText: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    productPromoText: v.optional(v.string()),
    contentJson: v.string(),
    contentHtml: v.string(),
    status: emailTemplateStatusValidator,
    productIds: v.optional(v.array(v.id("products"))),
    createdByUserId: v.string(),
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status_updated", ["status", "updatedAt"])
    .index("by_created_at", ["createdAt"]),

  emailCampaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    headline: v.optional(v.string()),
    previewText: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    productPromoText: v.optional(v.string()),
    suggestedSegmentKeys: v.optional(v.string()),
    templateId: v.optional(v.id("emailTemplates")),
    contentJson: v.optional(v.string()),
    contentHtml: v.optional(v.string()),
    productIds: v.optional(v.array(v.id("products"))),
    segmentType: emailCampaignSegmentValidator,
    segmentCriteria: v.optional(v.string()),
    selectedSubscriberIds: v.optional(v.array(v.id("subscribers"))),
    status: emailCampaignStatusValidator,
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    recipientCount: v.number(),
    productCount: v.number(),
    emailsSent: v.number(),
    emailsDelivered: v.number(),
    emailsFailed: v.number(),
    emailsOpened: v.number(),
    emailsClicked: v.number(),
    uniqueOpens: v.optional(v.number()),
    uniqueClicks: v.optional(v.number()),
    attributedRevenue: v.optional(v.number()),
    sentByUserId: v.optional(v.string()),
    sentByName: v.optional(v.string()),
    sendLockAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
    createdByUserId: v.string(),
    createdByName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_sent_at", ["sentAt"])
    .index("by_created_at", ["createdAt"]),

  emailCampaignRecipients: defineTable({
    campaignId: v.id("emailCampaigns"),
    subscriberId: v.id("subscribers"),
    email: v.string(),
    status: emailRecipientStatusValidator,
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    failedAt: v.optional(v.number()),
    openedAt: v.optional(v.number()),
    clickedAt: v.optional(v.number()),
    retryCount: v.number(),
    lastError: v.optional(v.string()),
    resendMessageId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_campaign_id", ["campaignId"])
    .index("by_campaign_id_status", ["campaignId", "status"])
    .index("by_campaign_subscriber", ["campaignId", "subscriberId"])
    .index("by_sent_at", ["sentAt"]),

  subscriberInterestProfiles: defineTable({
    subscriberId: v.id("subscribers"),
    email: v.string(),
    interestTags: v.array(v.string()),
    orderCount: v.number(),
    totalSpent: v.number(),
    lastOrderAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_subscriber", ["subscriberId"])
    .index("by_email", ["email"]),

  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    message: v.string(),
    submittedAt: v.number(),
    read: v.boolean(),
    source: v.optional(v.string()),
  }).index("by_submitted_at", ["submittedAt"]),

  settings: defineTable({
    key: v.string(),
    name: v.string(),
    value: v.string(),
    isSystem: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  orders: defineTable({
    orderNumber: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.string(),
    customerAddress: v.string(),
    customerNotes: v.optional(v.string()),
    termsAccepted: v.boolean(),
    privacyAccepted: v.boolean(),
    userId: v.optional(v.string()),
    status: orderStatusValidator,
    paymentMethod: paymentMethodValidator,
    paymentStatus: paymentStatusValidator,
    subtotal: v.number(),
    discountTotal: v.optional(v.number()),
    tax: v.number(),
    shipping: v.number(),
    total: v.number(),
    currency: v.string(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeTransactionId: v.optional(v.string()),
    idempotencyKey: v.string(),
    paidAt: v.optional(v.number()),
    reviewInvitationSentAt: v.optional(v.number()),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
    deliveryMethodLabel: v.optional(v.string()),
    deliveryCharge: v.optional(v.number()),
    deliveryEstimate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order_number", ["orderNumber"])
    .index("by_stripe_session", ["stripeSessionId"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_customer_phone", ["customerPhone"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    color: v.string(),
    sku: v.optional(v.string()),
    size: v.optional(v.string()),
    quantity: v.number(),
    unitPrice: v.number(),
    lineTotal: v.number(),
    imageUrl: v.string(),
    originalUnitPrice: v.optional(v.number()),
    discountPercent: v.optional(v.number()),
    discountAmount: v.optional(v.number()),
    lineDiscountTotal: v.optional(v.number()),
    finalUnitPrice: v.optional(v.number()),
    shippingCharge: v.optional(v.number()),
    lineShippingTotal: v.optional(v.number()),
    isPromotionGift: v.optional(v.boolean()),
    promotionId: v.optional(v.id("productPromotions")),
    warrantySummary: v.optional(v.string()),
  })
    .index("by_order_id", ["orderId"])
    .index("by_product_id", ["productId"]),

  productPromotions: defineTable({
    type: v.union(
      v.literal("bogo"),
      v.literal("buy_x_get_y"),
      v.literal("free_gift"),
      v.literal("cross_product")
    ),
    name: v.string(),
    description: v.optional(v.string()),
    promotionMessage: v.optional(v.string()),
    bannerText: v.optional(v.string()),
    buyProductId: v.id("products"),
    buyQuantity: v.number(),
    getProductId: v.optional(v.id("products")),
    getQuantity: v.number(),
    startAt: v.number(),
    endAt: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    viewCount: v.number(),
    clickCount: v.number(),
    conversionCount: v.number(),
    ordersCount: v.number(),
    revenueGenerated: v.number(),
    freeProductsGiven: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_buy_product", ["buyProductId"])
    .index("by_get_product", ["getProductId"])
    .index("by_status", ["status"])
    .index("by_status_and_start", ["status", "startAt"]),

  orderPromotions: defineTable({
    orderId: v.id("orders"),
    promotionId: v.id("productPromotions"),
    promotionType: v.union(
      v.literal("bogo"),
      v.literal("buy_x_get_y"),
      v.literal("free_gift"),
      v.literal("cross_product")
    ),
    promotionName: v.string(),
    promotionDescription: v.optional(v.string()),
    buyProductId: v.id("products"),
    getProductId: v.optional(v.id("products")),
    freeQuantity: v.number(),
    savingsAmount: v.number(),
    appliedAt: v.number(),
  })
    .index("by_order_id", ["orderId"])
    .index("by_promotion_id", ["promotionId"]),

  productReviews: defineTable({
    productId: v.id("products"),
    orderId: v.id("orders"),
    customerName: v.string(),
    customerEmail: v.string(),
    customerUserId: v.optional(v.string()),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
    imageStorageIds: v.optional(v.array(v.id("_storage"))),
    isVerifiedPurchase: v.boolean(),
    isApproved: v.boolean(),
    helpfulCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    aiAnalysisStatus: v.optional(aiAnalysisStatusValidator),
    aiSentiment: v.optional(aiSentimentValidator),
    aiSentimentConfidence: v.optional(v.number()),
    aiTags: v.optional(v.array(v.string())),
    aiModeration: v.optional(aiModerationValidator),
    embedding: v.optional(v.array(v.float64())),
    aiAnalyzedAt: v.optional(v.number()),
    aiError: v.optional(v.string()),
    adminReplyDraft: v.optional(v.string()),
    adminReplyPublished: v.optional(v.string()),
    adminReplyPublishedAt: v.optional(v.number()),
    adminReplyError: v.optional(v.string()),
    aiActiveGenerationVersion: v.optional(v.number()),
    source: v.optional(v.union(v.literal("web"), v.literal("vapi"))),
    recommendationScore: v.optional(v.number()),
  })
    .index("by_order_product", ["orderId", "productId"])
    .index("by_product_approved_created", ["productId", "isApproved", "createdAt"])
    .index("by_product_approved_rating", ["productId", "isApproved", "rating"])
    .index("by_product_approved_helpful", ["productId", "isApproved", "helpfulCount"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_approval_created", ["isApproved", "createdAt"])
    .index("by_rating", ["rating"])
    .index("by_order_id", ["orderId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["productId", "isApproved"],
    }),

  productReviewInsights: defineTable({
    productId: v.id("products"),
    summary: v.string(),
    topics: v.array(reviewTopicValidator),
    reviewCountAtGeneration: v.number(),
    generatedAt: v.number(),
    aiAnalysisStatus: productInsightsStatusValidator,
  }).index("by_product", ["productId"]),

  reviewTagIndex: defineTable({
    productId: v.id("products"),
    reviewId: v.id("productReviews"),
    tagSlug: v.string(),
    tagLabel: v.string(),
    isApproved: v.boolean(),
  }).index("by_product_tag", ["productId", "tagSlug", "isApproved"]),

  reviewHelpfulVotes: defineTable({
    reviewId: v.id("productReviews"),
    voterKey: v.string(),
    createdAt: v.number(),
  }).index("by_review_voter", ["reviewId", "voterKey"]),

  reviewAiJobs: defineTable({
    jobType: reviewAiJobTypeValidator,
    reviewId: v.optional(v.id("productReviews")),
    productId: v.optional(v.id("products")),
    status: reviewAiJobStatusValidator,
    priority: v.number(),
    retryCount: v.number(),
    maxRetries: v.number(),
    nextRetryAt: v.optional(v.number()),
    lastError: v.optional(v.string()),
    lastErrorCode: v.optional(reviewAiJobErrorCodeValidator),
    lastAttemptedProvider: v.optional(v.string()),
    successfulProvider: v.optional(v.string()),
    fallbackTriggered: v.optional(v.boolean()),
    generationMode: v.optional(reviewAiGenerationModeValidator),
    idempotencyKey: v.string(),
    payload: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_priority", ["status", "priority"])
    .index("by_status_next_retry", ["status", "nextRetryAt"])
    .index("by_review_id", ["reviewId"])
    .index("by_idempotency", ["idempotencyKey"]),

  reviewAiGenerations: defineTable({
    reviewId: v.id("productReviews"),
    productId: v.optional(v.id("products")),
    type: reviewAiGenerationTypeValidator,
    content: v.string(),
    provider: v.string(),
    model: v.string(),
    version: v.number(),
    isActive: v.boolean(),
    source: reviewAiGenerationSourceValidator,
    triggeredBy: v.optional(v.string()),
    jobId: v.optional(v.id("reviewAiJobs")),
    durationMs: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_review_type_version", ["reviewId", "type", "version"])
    .index("by_review_active", ["reviewId", "isActive"])
    .index("by_provider_created", ["provider", "createdAt"])
    .index("by_source_created", ["source", "createdAt"]),

  reviewAiMetrics: defineTable({
    date: v.string(),
    provider: v.string(),
    type: v.string(),
    successCount: v.number(),
    failureCount: v.number(),
    fallbackCount: v.number(),
    totalDurationMs: v.number(),
    sampleCount: v.number(),
  }).index("by_date_provider_type", ["date", "provider", "type"]),

  orderStatusLogs: defineTable({
    orderId: v.id("orders"),
    event: v.string(),
    description: v.string(),
    previousStatus: v.optional(orderStatusValidator),
    newStatus: v.optional(orderStatusValidator),
    actorType: orderStatusLogActorValidator,
    actorUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_order_id_created", ["orderId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  paymentLogs: defineTable({
    orderId: v.id("orders"),
    event: v.string(),
    description: v.string(),
    previousPaymentStatus: v.optional(paymentStatusValidator),
    newPaymentStatus: v.optional(paymentStatusValidator),
    actorType: paymentLogActorValidator,
    actorUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeTransactionId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_order_id_created", ["orderId", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  adminActivityLogs: defineTable({
    type: v.string(),
    title: v.string(),
    description: v.string(),
    actorType: v.union(
      v.literal("system"),
      v.literal("admin"),
      v.literal("customer"),
      v.literal("webhook")
    ),
    actorUserId: v.optional(v.string()),
    actorName: v.optional(v.string()),
    relatedOrderId: v.optional(v.id("orders")),
    relatedProductId: v.optional(v.id("products")),
    relatedCampaignId: v.optional(v.id("emailCampaigns")),
    relatedTemplateId: v.optional(v.id("emailTemplates")),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  trackingRateLimits: defineTable({
    bucketKey: v.string(),
    attemptCount: v.number(),
    windowStart: v.number(),
  }).index("by_bucket_key", ["bucketKey"]),

  customerProfiles: defineTable({
    email: v.string(),
    fullName: v.string(),
    phone: v.string(),
    address: v.string(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  stripeWebhookEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    orderId: v.optional(v.id("orders")),
    payloadSummary: v.optional(v.string()),
    processedAt: v.number(),
  })
    .index("by_event_id", ["eventId"])
    .index("by_order_id", ["orderId"]),

  vapiConversations: defineTable({
    vapiCallId: v.string(),
    channel: v.union(v.literal("voice"), v.literal("chat")),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
    summary: v.optional(v.string()),
    metadata: v.optional(v.string()),
    pendingCheckoutUrl: v.optional(v.string()),
    pendingOrderNumber: v.optional(v.string()),
    pendingCheckoutTotal: v.optional(v.number()),
    pendingCheckoutCurrency: v.optional(v.string()),
    pendingCheckoutAt: v.optional(v.number()),
  })
    .index("by_vapi_call_id", ["vapiCallId"])
    .index("by_started_at", ["startedAt"]),

  vapiConversationLogs: defineTable({
    conversationId: v.id("vapiConversations"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("tool"),
      v.literal("system")
    ),
    content: v.string(),
    toolName: v.optional(v.string()),
    toolInput: v.optional(v.string()),
    toolOutput: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_created_at", ["createdAt"])
    .index("by_tool_name", ["toolName", "createdAt"]),

  vapiLeads: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    source: v.string(),
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("converted")
    ),
    conversationId: v.optional(v.id("vapiConversations")),
    createdAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"])
    .index("by_email", ["email"]),

  vapiSupportTickets: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.string(),
    conversationTranscript: v.string(),
    conversationId: v.optional(v.id("vapiConversations")),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved")
    ),
    createdAt: v.number(),
  })
    .index("by_status", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  vapiVoiceCarts: defineTable({
    conversationId: v.id("vapiConversations"),
    items: v.array(
      v.object({
        productId: v.id("products"),
        color: v.string(),
        quantity: v.number(),
      })
    ),
    updatedAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  vapiAnalyticsDaily: defineTable({
    dateKey: v.string(),
    conversations: v.number(),
    productSearches: v.number(),
    orderTrackingRequests: v.number(),
    leadsCaptured: v.number(),
    humanEscalations: v.number(),
    cartAdds: v.optional(v.number()),
    checkoutStarts: v.optional(v.number()),
  }).index("by_dateKey", ["dateKey"]),

  aiCopilotConversations: defineTable({
    adminUserId: v.string(),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_admin_updated", ["adminUserId", "updatedAt"])
    .index("by_admin_created", ["adminUserId", "createdAt"]),

  aiCopilotMessages: defineTable({
    conversationId: v.id("aiCopilotConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    response: v.optional(
      v.object({
        summary: v.string(),
        keyFindings: v.array(v.string()),
        recommendations: v.array(v.string()),
        dataSourcesUsed: v.array(v.string()),
        followUpQuestions: v.array(v.string()),
        insightCards: v.optional(
          v.array(
            v.object({
              type: v.union(
                v.literal("inventory"),
                v.literal("promotion"),
                v.literal("forecast"),
                v.literal("sentiment"),
                v.literal("marketing"),
                v.literal("search"),
                v.literal("risk"),
                v.literal("opportunity"),
                v.literal("pricing")
              ),
              title: v.string(),
              subtitle: v.optional(v.string()),
              productId: v.optional(v.id("products")),
              productName: v.optional(v.string()),
              metrics: v.array(
                v.object({
                  label: v.string(),
                  value: v.string(),
                  trend: v.optional(
                    v.union(v.literal("up"), v.literal("down"), v.literal("flat"))
                  ),
                })
              ),
              badges: v.array(
                v.object({
                  label: v.string(),
                  tone: v.union(
                    v.literal("info"),
                    v.literal("positive"),
                    v.literal("warning"),
                    v.literal("risk")
                  ),
                })
              ),
              recommendation: v.optional(v.string()),
              reason: v.optional(v.string()),
            })
          )
        ),
      })
    ),
    createdAt: v.number(),
  }).index("by_conversation_created", ["conversationId", "createdAt"]),

  aiCopilotSavedInsights: defineTable({
    adminUserId: v.string(),
    question: v.string(),
    response: v.object({
      summary: v.string(),
      keyFindings: v.array(v.string()),
      recommendations: v.array(v.string()),
      dataSourcesUsed: v.array(v.string()),
      followUpQuestions: v.array(v.string()),
      insightCards: v.optional(
        v.array(
          v.object({
            type: v.union(
              v.literal("inventory"),
              v.literal("promotion"),
              v.literal("forecast"),
              v.literal("sentiment"),
              v.literal("marketing"),
              v.literal("search"),
              v.literal("risk"),
              v.literal("opportunity"),
              v.literal("pricing")
            ),
            title: v.string(),
            subtitle: v.optional(v.string()),
            productId: v.optional(v.id("products")),
            productName: v.optional(v.string()),
            metrics: v.array(
              v.object({
                label: v.string(),
                value: v.string(),
                trend: v.optional(
                  v.union(v.literal("up"), v.literal("down"), v.literal("flat"))
                ),
              })
            ),
            badges: v.array(
              v.object({
                label: v.string(),
                tone: v.union(
                  v.literal("info"),
                  v.literal("positive"),
                  v.literal("warning"),
                  v.literal("risk")
                ),
              })
            ),
            recommendation: v.optional(v.string()),
            reason: v.optional(v.string()),
          })
        )
      ),
    }),
    conversationId: v.optional(v.id("aiCopilotConversations")),
    messageId: v.optional(v.id("aiCopilotMessages")),
    createdAt: v.number(),
  }).index("by_admin_created", ["adminUserId", "createdAt"]),

  aiCopilotAnalyticsCache: defineTable({
    cacheKey: v.string(),
    payload: v.string(),
    expiresAt: v.number(),
  }).index("by_cache_key", ["cacheKey"]),

  aiPricingRecommendations: defineTable({
    productId: v.optional(v.id("products")),
    adminUserId: v.string(),
    productName: v.string(),
    currentPrice: v.number(),
    suggestedPrice: v.number(),
    minRecommendedPrice: v.number(),
    maxRecommendedPrice: v.number(),
    confidence: v.number(),
    healthStatus: v.union(
      v.literal("optimal"),
      v.literal("underpriced"),
      v.literal("overpriced")
    ),
    reasoning: v.array(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("applied"),
      v.literal("dismissed")
    ),
    source: v.union(v.literal("product_form"), v.literal("copilot")),
    currency: v.string(),
    createdAt: v.number(),
  })
    .index("by_product_created", ["productId", "createdAt"])
    .index("by_admin_created", ["adminUserId", "createdAt"]),

  review_calls: defineTable({
    orderId: v.id("orders"),
    customerName: v.string(),
    customerPhone: v.string(),
    vapiCallId: v.optional(v.string()),
    status: reviewCallStatusValidator,
    initiatedByAdminId: v.optional(v.string()),
    attemptNumber: v.number(),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    transcript: v.optional(v.string()),
    reviewsCollected: v.array(reviewCollectedEntryValidator),
    endedReason: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_order_id", ["orderId"])
    .index("by_vapi_call_id", ["vapiCallId"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"]),

  customerRecommendationProfiles: defineTable({
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
  })
    .index("by_identity", ["identityType", "identityKey"])
    .index("by_email", ["email"])
    .index("by_last_activity", ["lastActivityAt"])
    .index("by_refresh_date", ["profileRefreshedAt"]),

  customerBehaviorEvents: defineTable({
    eventType: customerBehaviorEventTypeValidator,
    visitorId: v.string(),
    sessionId: v.optional(v.string()),
    customerKey: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    categoryId: v.optional(v.id("productCategories")),
    query: v.optional(v.string()),
    metadata: v.optional(v.string()),
    weight: v.number(),
    occurredAt: v.number(),
  })
    .index("by_visitor_time", ["visitorId", "occurredAt"])
    .index("by_customer_time", ["customerKey", "occurredAt"])
    .index("by_product_time", ["productId", "occurredAt"])
    .index("by_type_time", ["eventType", "occurredAt"]),

  wishlistItems: defineTable({
    identityType: recommendationIdentityTypeValidator,
    identityKey: v.string(),
    productId: v.id("products"),
    addedAt: v.number(),
  })
    .index("by_identity_product", ["identityType", "identityKey", "productId"])
    .index("by_identity_added", ["identityType", "identityKey", "addedAt"]),

  productCoOccurrence: defineTable({
    productId: v.id("products"),
    relatedProductId: v.id("products"),
    coPurchaseCount: v.number(),
    score: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product_score", ["productId", "score"])
    .index("by_product_related", ["productId", "relatedProductId"]),

  recommendationCache: defineTable({
    cacheKey: v.string(),
    sectionType: recommendationSectionTypeValidator,
    productIds: v.array(v.id("products")),
    scores: v.array(v.number()),
    explanations: v.optional(v.string()),
    source: recommendationSourceValidator,
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_cache_key", ["cacheKey"])
    .index("by_expires", ["expiresAt"]),

  recommendationJobs: defineTable({
    jobType: recommendationJobTypeValidator,
    status: recommendationJobStatusValidator,
    identityType: v.optional(recommendationIdentityTypeValidator),
    identityKey: v.optional(v.string()),
    productId: v.optional(v.id("products")),
    attempts: v.number(),
    maxAttempts: v.number(),
    idempotencyKey: v.string(),
    processedBy: v.optional(v.union(v.literal("convex"), v.literal("n8n"))),
    provider: v.optional(v.string()),
    error: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
    triggeredBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_created", ["status", "createdAt"])
    .index("by_status_next_retry", ["status", "nextRetryAt"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_job_type_status", ["jobType", "status"]),

  recommendationAnalytics: defineTable({
    date: v.string(),
    sectionType: recommendationSectionTypeValidator,
    source: recommendationSourceValidator,
    impressions: v.number(),
    clicks: v.number(),
    conversions: v.number(),
    revenue: v.number(),
    segment: v.optional(v.string()),
    provider: v.optional(v.string()),
    n8nUsed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_date_section", ["date", "sectionType"])
    .index("by_date", ["date"]),

  recommendationEvents: defineTable({
    eventType: recommendationInteractionTypeValidator,
    sectionType: recommendationSectionTypeValidator,
    productId: v.id("products"),
    visitorId: v.optional(v.string()),
    customerKey: v.optional(v.string()),
    cacheKey: v.optional(v.string()),
    source: v.optional(recommendationSourceValidator),
    revenue: v.optional(v.number()),
    occurredAt: v.number(),
  })
    .index("by_section_time", ["sectionType", "occurredAt"])
    .index("by_product_time", ["productId", "occurredAt"])
    .index("by_visitor_time", ["visitorId", "occurredAt"]),
});
