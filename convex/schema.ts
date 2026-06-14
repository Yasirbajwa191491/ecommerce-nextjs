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

export const productImageValidator = v.object({ url: v.string() });

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
    categoryId: v.id("productCategories"),
    featured: v.boolean(),
    shipping: v.boolean(),
    discountPercent: v.optional(v.number()),
    shippingCharges: v.optional(v.number()),
    stock: v.number(),
    reviews: v.number(),
    stars: v.number(),
    description: v.string(),
    active: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    embedding: v.optional(v.array(v.float64())),
    embeddingStatus: v.optional(aiAnalysisStatusValidator),
    embeddingContentHash: v.optional(v.string()),
    embeddingUpdatedAt: v.optional(v.number()),
  })
    .index("by_sort_order", ["sortOrder"])
    .index("by_category_id", ["categoryId"])
    .index("by_featured", ["featured"])
    .index("by_active_sort", ["active", "sortOrder"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["active"],
    }),

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
    source: v.union(v.literal("header"), v.literal("catalog")),
  })
    .index("by_searched_at", ["searchedAt"])
    .index("by_query_normalized_time", ["queryNormalized", "searchedAt"]),

  searchEmbeddingCache: defineTable({
    queryNormalized: v.string(),
    embedding: v.array(v.float64()),
    createdAt: v.number(),
  }).index("by_query_normalized", ["queryNormalized"]),

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
  })
    .index("by_order_id", ["orderId"])
    .index("by_product_id", ["productId"]),

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
});
