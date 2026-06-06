import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  orderStatusLogActorValidator,
  orderStatusValidator,
  paymentLogActorValidator,
  paymentMethodValidator,
  paymentStatusValidator,
} from "./lib/orderValidators";

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
    stock: v.number(),
    reviews: v.number(),
    stars: v.number(),
    description: v.string(),
    active: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_sort_order", ["sortOrder"])
    .index("by_category_id", ["categoryId"])
    .index("by_featured", ["featured"])
    .index("by_active_sort", ["active", "sortOrder"]),

  subscribers: defineTable({
    email: v.string(),
    active: v.boolean(),
    subscribedAt: v.number(),
    source: v.optional(v.string()),
  }).index("by_email", ["email"]),

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
    tax: v.number(),
    shipping: v.number(),
    total: v.number(),
    currency: v.string(),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeTransactionId: v.optional(v.string()),
    idempotencyKey: v.string(),
    paidAt: v.optional(v.number()),
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
  }).index("by_order_id", ["orderId"]),

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
});
