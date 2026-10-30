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
  alertSeverityValidator,
  alertStatusValidator,
  artifactAvailabilityValidator,
  datasetTypeValidator,
  evaluationStatusValidator,
  lifecycleValidator,
  mlFamilyValidator,
  retrainJobValidator,
  retrainStateValidator,
  runtimeStatusValidator,
} from "./lib/mlops/validators";
import {
  orderNotificationEventValidator,
  pushPlatformValidator,
} from "./lib/notificationTypes";
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
import {
  qrScanEventValidator,
  qrScanSourceValidator,
  qrStatusValidator,
  qrTypeValidator,
} from "./lib/qrValidators";
import {
  agentApprovalStatusValidator,
  agentStateValidator,
} from "./lib/agents/validators";

export const productImageValidator = v.object({
  url: v.string(),
  alt: v.optional(v.string()),
});

export default defineSchema({
  guestCapabilities: defineTable({ tokenHash: v.string(), createdAt: v.number() }).index("by_hash", ["tokenHash"]),
  orderRecoveryChallenges: defineTable({
    challengeHash: v.string(), email: v.string(), orderNumber: v.string(), otpHash: v.string(),
    expiresAt: v.number(), attempts: v.number(), consumed: v.boolean(),
  }).index("by_challenge", ["challengeHash"]),
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
    /** Discounted price maintained for indexed price sorting. */
    finalPrice: v.optional(v.number()),
  })
    .index("by_stock", ["stock"])
    .index("by_sort_order", ["sortOrder"])
    .index("by_category_id", ["categoryId"])
    .index("by_featured", ["featured"])
    .index("by_active_sort", ["active", "sortOrder"])
    .index("by_price", ["price"])
    .index("by_final_price", ["finalPrice"])
    .index("by_currency_final_price", ["currency", "finalPrice"])
    .index("by_currency_sort", ["currency", "sortOrder"])
    .index("by_stars", ["stars"])
    .index("by_reviews", ["reviews"])
    .index("by_name", ["name"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["featured"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["active"],
    })
    .vectorIndex("by_image_embedding", {
      vectorField: "imageEmbedding",
      dimensions: 768,
      filterFields: ["active", "imageEmbeddingVersion"],
    })
    .vectorIndex("by_image_embedding_clip", {
      vectorField: "imageEmbeddingClip",
      dimensions: 512,
      filterFields: ["active", "imageEmbeddingVersion"],
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
    .index("by_created_at", ["createdAt"])
    .index("by_idempotency", ["idempotencyKey"]),

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
    subject: v.optional(v.string()),
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
    customerPhoneNormalized: v.optional(v.string()),
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
    accessToken: v.optional(v.string()),
    idempotencyKey: v.string(),
    paidAt: v.optional(v.number()),
    /**
     * Inventory gate. Unset = stock is deducted for this order.
     * Set at checkout (uncommitted) or after cancel/refund/expire (returned).
     * Never infer from status.
     */
    stockReleasedAt: v.optional(v.number()),
    /** Set when paid units have been added to productSalesTotals. */
    salesCountedAt: v.optional(v.number()),
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
    .index("by_stripe_payment_intent", ["stripePaymentIntentId"])
    .index("by_access_token", ["accessToken"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_customer_email", ["customerEmail"])
    .index("by_customer_email_created", ["customerEmail", "createdAt"])
    .index("by_customer_phone", ["customerPhone"])
    .index("by_customer_phone_normalized", ["customerPhoneNormalized"])
    .index("by_status", ["status"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_created_at", ["createdAt"])
    .index("by_total", ["total"]),

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

  qrCodes: defineTable({
    token: v.string(),
    tokenHash: v.string(),
    type: qrTypeValidator,
    targetId: v.string(),
    orderId: v.optional(v.id("orders")),
    productId: v.optional(v.id("products")),
    status: qrStatusValidator,
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastScannedAt: v.optional(v.number()),
    lastScanSource: v.optional(qrScanSourceValidator),
    createdBy: v.optional(v.string()),
    metadata: v.optional(
      v.object({
        amount: v.optional(v.number()),
        currency: v.optional(v.string()),
      })
    ),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_type_target_status", ["type", "targetId", "status"])
    .index("by_order_type", ["orderId", "type"])
    .index("by_product_type", ["productId", "type"])
    .index("by_created_at", ["createdAt"]),

  qrScans: defineTable({
    qrCodeId: v.optional(v.id("qrCodes")),
    type: v.optional(qrTypeValidator),
    targetId: v.optional(v.string()),
    scannedAt: v.number(),
    source: qrScanSourceValidator,
    platform: v.optional(v.string()),
    authenticatedUserId: v.optional(v.string()),
    success: v.boolean(),
    /** resolved | payment_initiated | payment_succeeded — not implied by success alone */
    event: v.optional(qrScanEventValidator),
    failureReason: v.optional(v.string()),
  })
    .index("by_qr_code", ["qrCodeId"])
    .index("by_scanned_at", ["scannedAt"]),

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
    embeddingVersion: v.optional(v.string()),
    embeddingScope: v.optional(v.string()),
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
      filterFields: ["productId", "isApproved", "embeddingScope"],
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
    accessToken: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  stripeWebhookEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    orderId: v.optional(v.id("orders")),
    payloadSummary: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
    /** Set only after the handler finishes. Absence means a retry should resume. */
    processedAt: v.optional(v.number()),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("processed"), v.literal("failed"))
    ),
    lastError: v.optional(v.string()),
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
    browserSessionToken: v.optional(v.string()),
    browserSessionVerifiedAt: v.optional(v.number()),
    messageCount: v.optional(v.number()),
    userMessages: v.optional(v.number()),
    assistantMessages: v.optional(v.number()),
    toolCalls: v.optional(v.number()),
  })
    .index("by_vapi_call_id", ["vapiCallId"])
    .index("by_started_at", ["startedAt"])
    .index("by_browser_session", ["browserSessionToken"]),

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
    sourceKey: v.optional(v.string()),
  })
    .index("by_visitor_time", ["visitorId", "occurredAt"])
    .index("by_customer_time", ["customerKey", "occurredAt"])
    .index("by_product_time", ["productId", "occurredAt"])
    .index("by_type_time", ["eventType", "occurredAt"])
    .index("by_source_key", ["sourceKey"]),

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
    orderId: v.optional(v.id("orders")),
    sourceKey: v.optional(v.string()),
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
    .index("by_order", ["orderId"])
    .index("by_source_key", ["sourceKey"])
    .index("by_customer_product", ["customerKey", "productId", "eventType", "occurredAt"])
    .index("by_section_time", ["sectionType", "occurredAt"])
    .index("by_product_time", ["productId", "occurredAt"])
    .index("by_visitor_time", ["visitorId", "occurredAt"]),

  pushTokens: defineTable({
    customerEmail: v.string(),
    visitorId: v.string(),
    expoPushToken: v.string(),
    platform: pushPlatformValidator,
    deviceName: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    executionEnvironment: v.optional(v.string()),
    isActive: v.boolean(),
    lastSeenAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_expo_push_token", ["expoPushToken"])
    .index("by_customer_email_active", ["customerEmail", "isActive"])
    .index("by_visitor_id", ["visitorId"]),

  customerNotificationPreferences: defineTable({
    customerEmail: v.string(),
    orderUpdates: v.boolean(),
    paymentUpdates: v.boolean(),
    promotionalNotifications: v.boolean(),
    updatedAt: v.number(),
  }).index("by_customer_email", ["customerEmail"]),

  notificationEvents: defineTable({
    eventKey: v.string(),
    eventType: orderNotificationEventValidator,
    orderId: v.optional(v.id("orders")),
    customerEmail: v.string(),
    channelsAttempted: v.array(v.string()),
    pushDelivered: v.boolean(),
    emailDelivered: v.boolean(),
    smsDelivered: v.boolean(),
    pushFailureReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_key", ["eventKey"])
    .index("by_customer_email_created", ["customerEmail", "createdAt"]),

  inAppNotifications: defineTable({
    customerEmail: v.string(),
    /** Required for new records; optional for legacy rows migrated via backfill. */
    eventKey: v.optional(v.string()),
    visitorId: v.optional(v.string()),
    type: orderNotificationEventValidator,
    title: v.string(),
    body: v.string(),
    orderId: v.optional(v.id("orders")),
    orderNumber: v.optional(v.string()),
    deepLinkPath: v.optional(v.string()),
    readAt: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_event_key", ["eventKey"])
    .index("by_customer_email_created", ["customerEmail", "createdAt"])
    .index("by_customer_email_unread", ["customerEmail", "readAt"])
    .index("by_order_id", ["orderId"])
    .index("by_expires_at", ["expiresAt"]),

  stripeRefundAttempts: defineTable({
    orderId: v.id("orders"),
    paymentIntentId: v.string(),
    amountCents: v.optional(v.number()),
    reason: v.string(),
    feePercent: v.optional(v.number()),
    idempotencyKey: v.string(),
    leaseVersion: v.optional(v.number()),
    stripeRefundId: v.optional(v.string()),
    stripeRefundedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("succeeded")
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    lastError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_status_next", ["status", "nextAttemptAt"])
    .index("by_order", ["orderId"]),

  productSalesTotals: defineTable({
    productId: v.id("products"),
    unitsSold: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_units_sold", ["unitsSold"]),

  aggregateContributions: defineTable({
    key: v.string(),
    sourceId: v.string(),
    countsJson: v.string(),
    groupKey: v.optional(v.string()),
  }).index("by_key_source", ["key", "sourceId"]),

  aggregateGroups: defineTable({
    key: v.string(),
    count: v.number(),
  }).index("by_key", ["key"]),

  orderSalesContributions: defineTable({
    orderId: v.id("orders"),
    unitsJson: v.string(),
  }).index("by_order", ["orderId"]),

  productPaidSales: defineTable({
    productId: v.id("products"),
    unitsSold: v.number(),
    updatedAt: v.number(),
  }).index("by_product", ["productId"]).index("by_units_sold", ["unitsSold"]),

  maintainedAggregates: defineTable({
    key: v.string(),
    countsJson: v.string(),
    ready: v.boolean(),
    cursor: v.optional(v.union(v.string(), v.null())),
    buildingJson: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  vapiBrowserClaims: defineTable({
    vapiCallId: v.string(),
    browserSessionToken: v.string(),
    createdAt: v.number(),
  }).index("by_call_id", ["vapiCallId"]),

  contentRecommendationSnapshots: defineTable({
    snapshotId: v.string(),
    status: v.union(
      v.literal("staging"),
      v.literal("published"),
      v.literal("failed"),
      v.literal("archived")
    ),
    modelVersion: v.string(),
    artifactVersion: v.string(),
    datasetFingerprint: v.string(),
    datasetSource: v.union(v.literal("synthetic"), v.literal("real_catalog")),
    expectedProductCount: v.number(),
    storedProductCount: v.number(),
    topK: v.number(),
    generatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    error: v.optional(v.string()),
  })
    .index("by_snapshot_id", ["snapshotId"])
    .index("by_status", ["status"]),

  contentRecommendationItems: defineTable({
    snapshotId: v.string(),
    productId: v.id("products"),
    recommendedProductIds: v.array(v.id("products")),
    scores: v.array(v.number()),
    modelVersion: v.string(),
    artifactVersion: v.string(),
    generatedAt: v.number(),
  })
    .index("by_snapshot_and_product", ["snapshotId", "productId"])
    .index("by_snapshot", ["snapshotId"]),

  pythonMlShadowRuns: defineTable({
    status: v.union(
      v.literal("running"),
      v.literal("complete"),
      v.literal("skipped"),
      v.literal("failed")
    ),
    requestedStrategy: v.union(
      v.literal("content"),
      v.literal("collaborative"),
      v.literal("hybrid"),
      v.literal("neural")
    ),
    modelAvailable: v.boolean(),
    comparedCount: v.number(),
    fallbackCount: v.number(),
    overlapAtK: v.optional(v.number()),
    rankAgreement: v.optional(v.number()),
    candidateCoverage: v.optional(v.number()),
    validCandidateRate: v.optional(v.number()),
    latencyMs: v.optional(v.number()),
    errorCode: v.optional(v.string()),
    summaryJson: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_created", ["createdAt"]),

  /**
   * RAG chunks. Separate from products.by_embedding so policy and FAQ chunks
   * do not overwrite catalog search embeddings. Dimensions stay 384 to reuse
   * the existing embedding providers.
   */
  ragChunks: defineTable({
    chunkId: v.string(),
    documentId: v.string(),
    sourceType: v.union(
      v.literal("product"),
      v.literal("shipping_policy"),
      v.literal("return_policy"),
      v.literal("privacy_policy"),
      v.literal("terms"),
      v.literal("faq")
    ),
    sourceId: v.string(),
    productId: v.optional(v.string()),
    title: v.string(),
    section: v.string(),
    content: v.string(),
    contentHash: v.string(),
    metadataJson: v.string(),
    visibility: v.literal("public"),
    embedding: v.array(v.float64()),
    embeddingVersion: v.string(),
    indexVersion: v.string(),
    active: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_chunk_id", ["chunkId"])
    .index("by_document", ["documentId"])
    .index("by_source", ["sourceType", "sourceId"])
    .index("by_active", ["active"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["active", "sourceType"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["active"],
    }),

  ragIndexState: defineTable({
    indexVersion: v.string(),
    embeddingVersion: v.string(),
    documentCount: v.number(),
    chunkCount: v.number(),
    failedCount: v.number(),
    updatedAt: v.number(),
    reindexStatus: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("unchanged"),
        v.literal("complete"),
        v.literal("partial"),
        v.literal("failed")
      )
    ),
  }).index("by_version", ["indexVersion"]),

  ragIndexFailures: defineTable({
    documentId: v.string(),
    error: v.string(),
    attempts: v.number(),
    updatedAt: v.number(),
  }).index("by_document", ["documentId"]),

  ragSessions: defineTable({
    sessionKey: v.string(),
    turnsJson: v.string(),
    askCount: v.number(),
    windowStartedAt: v.number(),
    expiresAt: v.number(),
    updatedAt: v.number(),
  })    .index("by_session_key", ["sessionKey"]),

  forecastPublications: defineTable({
    publicationId: v.string(),
    status: v.union(v.literal("published"), v.literal("archived"), v.literal("staging")),
    pointCount: v.optional(v.number()), insightCount: v.optional(v.number()), batches: v.optional(v.array(v.string())),
    modelVersion: v.string(),
    strategy: v.string(),
    horizonDays: v.number(),
    generatedAt: v.number(),
    dataCutoff: v.string(),
    trainedAt: v.string(),
    datasetLabel: v.string(),
    statisticallyWeak: v.boolean(),
    uncertaintyLabel: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_publication", ["publicationId"]),

  forecastPoints: defineTable({
    publicationId: v.string(),
    entityType: v.union(v.literal("product"), v.literal("category"), v.literal("store")),
    entityId: v.string(),
    forecastDate: v.string(),
    predictedUnits: v.number(),
    lowerUnits: v.number(),
    upperUnits: v.number(),
    modelName: v.string(),
    confidence: v.string(),
  })
    .index("by_publication", ["publicationId"])
    .index("by_publication_entity", ["publicationId", "entityType", "entityId"]),

  forecastInsights: defineTable({
    publicationId: v.string(),
    entityId: v.string(),
    productName: v.string(),
    categoryId: v.string(),
    currentStock: v.optional(v.number()),
    forecastUnits: v.number(),
    daysRemaining: v.optional(v.number()),
    stockoutRisk: v.string(),
    trend: v.string(),
    slowMoving: v.boolean(),
    highDemand: v.boolean(),
    reorderQuantity: v.optional(v.number()),
    reorderNote: v.string(),
    modelName: v.string(),
    confidence: v.string(),
  }).index("by_publication", ["publicationId"]),

  mlModelRegistry: defineTable({
    modelId: v.string(),
    modelFamily: mlFamilyValidator,
    modelVersion: v.string(),
    artifactVersion: v.string(),
    featureSchemaVersion: v.string(),
    datasetFingerprint: v.string(),
    datasetType: datasetTypeValidator,
    artifactChecksum: v.string(),
    trainingTimestamp: v.string(),
    registeredAt: v.number(),
    registeredBy: v.string(),
    evaluationStatus: evaluationStatusValidator,
    lifecycleStatus: lifecycleValidator,
    artifactAvailability: artifactAvailabilityValidator,
    runtimeStatus: runtimeStatusValidator,
    promotionInflight: v.boolean(),
    modelMetadataJson: v.string(),
    evaluationSummaryJson: v.string(),
  })
    .index("by_model_id", ["modelId"])
    .index("by_family_version", ["modelFamily", "modelVersion"])
    .index("by_family_lifecycle", ["modelFamily", "lifecycleStatus"])
    .index("by_registered", ["registeredAt"]),

  mlModelEvaluations: defineTable({
    modelId: v.string(),
    datasetFingerprint: v.string(),
    datasetType: datasetTypeValidator,
    evaluatedAt: v.number(),
    protocol: v.string(),
    sampleCount: v.number(),
    metricKind: v.union(v.literal("ranking"), v.literal("forecast"), v.literal("retrieval")),
    metricsJson: v.string(),
    limitations: v.string(),
    horizonOrK: v.union(v.number(), v.null()),
  })
    .index("by_model", ["modelId", "evaluatedAt"])
    .index("by_fingerprint", ["datasetFingerprint"]),

  mlModelPromotions: defineTable({
    modelFamily: mlFamilyValidator,
    previousModelId: v.optional(v.string()),
    nextModelId: v.string(),
    actor: v.string(),
    createdAt: v.number(),
    reason: v.string(),
    evaluationSummaryJson: v.string(),
    outcome: v.string(),
  })
    .index("by_family", ["modelFamily", "createdAt"])
    .index("by_created", ["createdAt"]),

  mlModelMonitoring: defineTable({
    modelFamily: mlFamilyValidator,
    modelVersion: v.string(),
    timeBucket: v.string(),
    requestCount: v.number(),
    successCount: v.number(),
    failureCount: v.number(),
    timeoutCount: v.number(),
    fallbackCount: v.number(),
    latencyCount: v.number(),
    latencySumMs: v.number(),
    latencyMaxMs: v.number(),
    lastErrorCategory: v.string(),
    lastSuccessAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_family_bucket", ["modelFamily", "timeBucket"])
    .index("by_bucket", ["timeBucket"]),

  mlDriftAlerts: defineTable({
    modelFamily: mlFamilyValidator,
    featureName: v.string(),
    metric: v.string(),
    referencePeriod: v.string(),
    currentPeriod: v.string(),
    driftScore: v.union(v.number(), v.null()),
    severity: alertSeverityValidator,
    sampleSize: v.number(),
    datasetVersion: v.string(),
    detectedAt: v.number(),
    status: alertStatusValidator,
    fingerprint: v.string(),
    acknowledgedBy: v.optional(v.string()),
    reason: v.string(),
  })
    .index("by_fingerprint", ["fingerprint"])
    .index("by_status", ["status", "detectedAt"])
    .index("by_family", ["modelFamily", "detectedAt"]),

  mlRetrainingJobs: defineTable({
    jobId: v.string(),
    modelFamily: mlFamilyValidator,
    jobType: retrainJobValidator,
    state: retrainStateValidator,
    datasetLabel: v.string(),
    datasetReadiness: v.string(),
    requestedBy: v.string(),
    authorizedBy: v.optional(v.string()),
    claimedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    reason: v.string(),
    failureReason: v.optional(v.string()),
    candidateModelId: v.optional(v.string()),
    evaluationSummaryJson: v.string(),
  })
    .index("by_job", ["jobId"])
    .index("by_state", ["state", "updatedAt"])
    .index("by_family_state", ["modelFamily", "state"]),

  mlModelAuditLogs: defineTable({
    actor: v.string(),
    action: v.string(),
    modelId: v.string(),
    createdAt: v.number(),
    outcome: v.string(),
    reason: v.string(),
  })
    .index("by_created", ["createdAt"])
    .index("by_model", ["modelId", "createdAt"]),

  forecastDemandDays: defineTable({
    cutoff: v.string(),
    productId: v.string(),
    snapshotDate: v.string(),
    units: v.number(),
    categoryId: v.string(),
  })
    .index("by_cutoff_product_date", ["cutoff", "productId", "snapshotDate"])
    .index("by_cutoff", ["cutoff"]),

  forecastDemandClaims: defineTable({
    lineKey: v.string(),
    cutoff: v.string(),
    productId: v.string(),
    snapshotDate: v.string(),
    units: v.number(),
  }).index("by_line", ["lineKey"]),

  forecastOrderClaims: defineTable({
    orderKey: v.string(),
    cutoff: v.string(),
    kind: v.union(v.literal("eligible"), v.literal("refund"), v.literal("ineligible")),
  }).index("by_order", ["orderKey", "cutoff"]),

  forecastProductCoverage: defineTable({
    cutoff: v.string(),
    productId: v.string(),
    observedDays: v.number(),
    units: v.number(),
    firstDate: v.string(),
    lastDate: v.string(),
    datesJson: v.string(),
    scanned: v.boolean(),
  })
    .index("by_cutoff_product", ["cutoff", "productId"])
    .index("by_cutoff_scanned", ["cutoff", "scanned"]),

  forecastQualityRuns: defineTable({
    cutoff: v.string(),
    status: v.union(v.literal("building"), v.literal("complete"), v.literal("failed")),
    cursor: v.optional(v.union(v.string(), v.null())),
    eligibleOrderCount: v.number(),
    excludedRefundCount: v.number(),
    skippedIneligibleCount: v.number(),
    observationCount: v.number(),
    productCount: v.number(),
    missingDateRate: v.number(),
    insufficientHistoryCount: v.number(),
    duplicateLineCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    note: v.string(),
  })
    .index("by_cutoff", ["cutoff"])
    .index("by_status", ["status"])
    .index("by_updated", ["updatedAt"]),

  inventorySnapshots: defineTable({
    productId: v.string(),
    snapshotDate: v.string(),
    availableStock: v.number(),
    productStatus: v.union(v.literal("active"), v.literal("inactive")),
    recordedAt: v.number(),
  })
    .index("by_product_date", ["productId", "snapshotDate"])
    .index("by_date", ["snapshotDate"]),

  inventorySnapshotRuns: defineTable({
    snapshotDate: v.string(),
    status: v.union(v.literal("building"), v.literal("complete")),
    cursor: v.optional(v.union(v.string(), v.null())),
    recordedCount: v.number(),
    startedAt: v.number(),
    updatedAt: v.number(),
  }).index("by_date", ["snapshotDate"]),

  agentRuns: defineTable({
    adminUserId: v.string(),
    adminName: v.string(),
    request: v.string(),
    requestSummary: v.string(),
    status: agentStateValidator,
    planSummary: v.string(),
    stepIndex: v.number(),
    toolCallCount: v.number(),
    plannerCalls: v.number(),
    replanCount: v.number(),
    approvalStatus: agentApprovalStatusValidator,
    recommendationsJson: v.string(),
    reportJson: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    errorCategory: v.optional(v.string()),
    version: v.number(),
    leaseOwner: v.optional(v.string()),
    leaseUntil: v.optional(v.number()),
    idempotencyKey: v.string(),
    maxToolCalls: v.number(),
    requireDraftApproval: v.boolean(),
    draftWritesEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.number(),
  })
    .index("by_admin_created", ["adminUserId", "createdAt"])
    .index("by_admin_status", ["adminUserId", "status"])
    .index("by_status", ["status"])
    .index("by_idempotency", ["idempotencyKey"])
    .index("by_expires", ["expiresAt"]),

  agentSteps: defineTable({
    runId: v.id("agentRuns"),
    stepIndex: v.number(),
    kind: v.union(v.literal("tool"), v.literal("plan"), v.literal("approval")),
    toolName: v.optional(v.string()),
    argumentsJson: v.optional(v.string()),
    resultJson: v.optional(v.string()),
    status: v.union(
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("skipped"),
      v.literal("pending")
    ),
    summary: v.string(),
    risk: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    errorCategory: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
    factType: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_run", ["runId", "stepIndex"])
    .index("by_idempotency", ["idempotencyKey"]),

  agentApprovals: defineTable({
    runId: v.id("agentRuns"),
    approvalKey: v.string(),
    stepIndex: v.number(),
    toolName: v.string(),
    argumentsHash: v.string(),
    argumentsJson: v.string(),
    summary: v.string(),
    risk: v.literal("draft_writing"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    requestedBy: v.string(),
    decidedBy: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    decidedAt: v.optional(v.number()),
    idempotencyKey: v.string(),
    executionStatus: v.union(v.literal("pending"), v.literal("executed"), v.literal("skipped")),
    draftId: v.optional(v.string()),
    draftUrl: v.optional(v.string()),
  })
    .index("by_run", ["runId"])
    .index("by_key", ["approvalKey"])
    .index("by_idempotency", ["idempotencyKey"]),

  agentAuditLogs: defineTable({
    runId: v.id("agentRuns"),
    adminUserId: v.string(),
    action: v.string(),
    toolName: v.optional(v.string()),
    summary: v.string(),
    createdAt: v.number(),
  })
    .index("by_run", ["runId", "createdAt"])
    .index("by_created", ["createdAt"]),

  agentMetrics: defineTable({
    day: v.string(),
    runsStarted: v.number(),
    runsCompleted: v.number(),
    runsFailed: v.number(),
    runsCancelled: v.number(),
    runsExpired: v.number(),
    toolSuccess: v.number(),
    toolFailure: v.number(),
    approvalRequests: v.number(),
    approvalDecisions: v.number(),
    providerFailures: v.number(),
    fallbackUsage: v.number(),
    totalSteps: v.number(),
    totalLatencyMs: v.number(),
    updatedAt: v.number(),
  }).index("by_day", ["day"]),
});
