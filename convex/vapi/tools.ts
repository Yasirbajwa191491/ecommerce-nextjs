import { internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v, ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { isProductActive } from "../lib/productActive";
import { enrichProduct, enrichProducts } from "../lib/products";
import { calculateFinalPrice } from "../lib/pricing";
import { getOrderStatusLogsForPublic } from "../lib/orderLogs";
import {
  normalizeEmail,
  toPublicOrderDetail,
  toPublicOrderSummary,
} from "../lib/publicOrderDto";
import { buildTrackingBucketKey, checkAndIncrementRateLimit } from "../lib/rateLimit";
import { incrementDailyAnalytics } from "./analyticsHelpers";
import {
  assertReviewEligibility,
  validateRating,
  validateReviewContent,
  validateReviewTitle,
} from "../lib/reviews";
import { SYSTEM_DEFAULTS } from "../settings";
import {
  toVapiOrderDetail,
  toVapiOrderSummary,
  toVapiProductDetail,
  toVapiProductSummary,
} from "./dtos";

const TRACKING_NOT_FOUND =
  "We couldn't find any orders matching your details.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function loadActiveProducts(ctx: QueryCtx) {
  const products = await ctx.db.query("products").collect();
  return products.filter(isProductActive);
}

async function findCategoryByName(ctx: QueryCtx, categoryName?: string) {
  if (!categoryName?.trim()) return null;
  const term = categoryName.trim().toLowerCase();
  const categories = await ctx.db
    .query("productCategories")
    .withIndex("by_active_sort", (q) => q.eq("active", true))
    .collect();
  return (
    categories.find(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term)
    ) ?? null
  );
}

async function getSettingValue(ctx: QueryCtx, key: string): Promise<string> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique();
  if (row) return row.value;
  const fallback = SYSTEM_DEFAULTS.find((s) => s.key === key);
  return fallback?.value ?? "";
}

function filterProducts(
  products: Awaited<ReturnType<typeof loadActiveProducts>>,
  args: {
    query?: string;
    categoryId?: Id<"productCategories">;
    maxPrice?: number;
    preference?: string;
  }
) {
  let filtered = [...products];

  if (args.categoryId) {
    filtered = filtered.filter((p) => p.categoryId === args.categoryId);
  }

  if (args.query?.trim()) {
    const term = args.query.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.company.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
    );
  }

  if (args.maxPrice !== undefined) {
    filtered = filtered.filter((p) => {
      const finalPrice = calculateFinalPrice(p.price, p.discountPercent ?? 0);
      return finalPrice <= args.maxPrice!;
    });
  }

  if (args.preference?.trim()) {
    const pref = args.preference.trim().toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(pref) ||
        p.description.toLowerCase().includes(pref)
    );
  }

  return filtered.sort(
    (a, b) => b.stars - a.stars || b.reviews - a.reviews
  );
}

async function lookupOrderForTracking(ctx: QueryCtx | MutationCtx, orderNumber: string) {
  const order = await ctx.db
    .query("orders")
    .withIndex("by_order_number", (q) => q.eq("orderNumber", orderNumber))
    .unique();
  if (!order) return null;

  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
    .collect();
  const statusHistory = await getOrderStatusLogsForPublic(ctx, order._id);
  return { order, items, statusHistory };
}

async function lookupOrdersByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_customer_email", (q) => q.eq("customerEmail", email))
    .collect();
  orders.sort((a, b) => b.createdAt - a.createdAt);
  return orders.slice(0, 50);
}

async function lookupOrderByNumber(ctx: QueryCtx | MutationCtx, orderNumber: string) {
  const normalized = orderNumber.trim();
  return await ctx.db
    .query("orders")
    .withIndex("by_order_number", (q) => q.eq("orderNumber", normalized))
    .unique();
}

function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254;
}

export const searchProducts = internalQuery({
  args: {
    query: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    maxPrice: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    products: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        price: v.number(),
        finalPrice: v.number(),
        discountPercent: v.number(),
        currency: v.string(),
        rating: v.number(),
        reviewsCount: v.number(),
        category: v.union(v.string(), v.null()),
        url: v.string(),
        inStock: v.boolean(),
      })
    ),
    count: v.number(),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 12);
    const category = await findCategoryByName(ctx, args.categoryName);
    const products = filterProducts(await loadActiveProducts(ctx), {
      query: args.query,
      categoryId: category?._id,
      maxPrice: args.maxPrice,
    });
    const page = products.slice(0, limit);
    const enriched = await enrichProducts(ctx, page);
    const mapped = enriched.map(toVapiProductSummary);
    return { products: mapped, count: mapped.length };
  },
});

export const getProductDetails = internalQuery({
  args: { productId: v.string() },
  returns: v.union(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      company: v.string(),
      price: v.number(),
      finalPrice: v.number(),
      discountPercent: v.number(),
      currency: v.string(),
      rating: v.number(),
      reviewsCount: v.number(),
      shippingInfo: v.string(),
      stock: v.number(),
      inStock: v.boolean(),
      url: v.string(),
      category: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId as Id<"products">);
    if (!product || !isProductActive(product)) return null;
    return toVapiProductDetail(await enrichProduct(ctx, product));
  },
});

export const recommendProducts = internalQuery({
  args: {
    category: v.optional(v.string()),
    maxBudget: v.optional(v.number()),
    preference: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    products: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        finalPrice: v.number(),
        discountPercent: v.number(),
        rating: v.number(),
        url: v.string(),
        inStock: v.boolean(),
      })
    ),
  }),
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 5, 1), 8);
    const category = await findCategoryByName(ctx, args.category);
    let products = filterProducts(await loadActiveProducts(ctx), {
      categoryId: category?._id,
      maxPrice: args.maxBudget,
      preference: args.preference,
    });

    if (products.length === 0) {
      products = filterProducts(await loadActiveProducts(ctx), {
        maxPrice: args.maxBudget,
      }).filter((p) => p.featured);
    }

    if (products.length === 0) {
      products = (await loadActiveProducts(ctx))
        .sort((a, b) => b.stars - a.stars)
        .slice(0, limit);
    }

    const enriched = await enrichProducts(ctx, products.slice(0, limit));
    return {
      products: enriched.map((p) => {
        const summary = toVapiProductSummary(p);
        return {
          id: summary.id,
          name: summary.name,
          finalPrice: summary.finalPrice,
          discountPercent: summary.discountPercent,
          rating: summary.rating,
          url: summary.url,
          inStock: summary.inStock,
        };
      }),
    };
  },
});

export const getCategories = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      description: v.string(),
      slug: v.string(),
    })
  ),
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    return categories
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        slug: c.slug,
      }));
  },
});

export const trackOrder = internalMutation({
  args: { orderNumber: v.string() },
  returns: v.object({
    found: v.boolean(),
    message: v.optional(v.string()),
    order: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const orderNumber = args.orderNumber.trim();
    if (!orderNumber) {
      return { found: false, message: TRACKING_NOT_FOUND };
    }

    const rateLimit = await checkAndIncrementRateLimit(
      ctx,
      buildTrackingBucketKey("order", orderNumber)
    );
    if (!rateLimit.allowed) {
      return {
        found: false,
        message: "Too many lookup attempts. Please try again later.",
      };
    }

    const result = await lookupOrderForTracking(ctx, orderNumber);
    if (!result) {
      return { found: false, message: TRACKING_NOT_FOUND };
    }

    await incrementDailyAnalytics(ctx, "orderTrackingRequests");

    return {
      found: true,
      order: toVapiOrderDetail(
        toPublicOrderDetail(
          result.order,
          result.items,
          result.statusHistory
        )
      ),
    };
  },
});

export const getOrdersByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.object({
    found: v.boolean(),
    message: v.optional(v.string()),
    orders: v.optional(v.array(v.any())),
  }),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      return { found: false, message: TRACKING_NOT_FOUND };
    }

    const rateLimit = await checkAndIncrementRateLimit(
      ctx,
      buildTrackingBucketKey("customer", email)
    );
    if (!rateLimit.allowed) {
      return {
        found: false,
        message: "Too many lookup attempts. Please try again later.",
      };
    }

    const orders = await lookupOrdersByEmail(ctx, email);
    if (!orders.length) {
      return { found: false, message: TRACKING_NOT_FOUND };
    }

    await incrementDailyAnalytics(ctx, "orderTrackingRequests");

    return {
      found: true,
      orders: orders.map((order) => toVapiOrderSummary(toPublicOrderSummary(order))),
    };
  },
});

export const getStoreInfo = internalQuery({
  args: {},
  returns: v.object({
    address: v.string(),
    phone: v.string(),
    email: v.string(),
    businessHours: v.string(),
    stats: v.object({
      productsAvailable: v.number(),
      ordersProcessed: v.number(),
      happyCustomers: v.number(),
      productCategories: v.number(),
    }),
  }),
  handler: async (ctx) => {
    const [address, phone, email, businessHours] = await Promise.all([
      getSettingValue(ctx, "address"),
      getSettingValue(ctx, "phone"),
      getSettingValue(ctx, "email"),
      getSettingValue(ctx, "business_hours"),
    ]);

    const products = await loadActiveProducts(ctx);
    const categories = await ctx.db
      .query("productCategories")
      .withIndex("by_active_sort", (q) => q.eq("active", true))
      .collect();
    const orders = await ctx.db.query("orders").collect();
    const processed = orders.filter(
      (o) => o.status !== "expired" && o.status !== "failed"
    );
    const customerEmails = new Set(
      processed.map((o) => o.customerEmail.toLowerCase())
    );

    return {
      address,
      phone,
      email,
      businessHours,
      stats: {
        productsAvailable: products.length,
        ordersProcessed: processed.length,
        happyCustomers: customerEmails.size,
        productCategories: categories.length,
      },
    };
  },
});

export const getShippingPolicy = internalQuery({
  args: {},
  returns: v.object({ policy: v.string() }),
  handler: async (ctx) => ({
    policy: await getSettingValue(ctx, "shipping_policy"),
  }),
});

export const getReturnPolicy = internalQuery({
  args: {},
  returns: v.object({ policy: v.string() }),
  handler: async (ctx) => ({
    policy: await getSettingValue(ctx, "return_policy"),
  }),
});

export const createLead = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    conversationId: v.optional(v.id("vapiConversations")),
  },
  returns: v.object({ success: v.boolean(), leadId: v.id("vapiLeads") }),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = normalizeEmail(args.email);
    const message = args.message.trim();
    const phone = args.phone?.trim();

    if (name.length < 2) {
      throw new ConvexError("Please provide a valid name.");
    }
    if (!isValidEmail(email)) {
      throw new ConvexError("Please provide a valid email address.");
    }
    if (message.length < 5) {
      throw new ConvexError("Please provide a brief message.");
    }

    const leadId = await ctx.db.insert("vapiLeads", {
      name,
      email,
      phone: phone || undefined,
      message,
      source: "vapi_assistant",
      status: "new",
      conversationId: args.conversationId,
      createdAt: Date.now(),
    });

    await incrementDailyAnalytics(ctx, "leadsCaptured");

    return { success: true, leadId };
  },
});

export const createReview = internalMutation({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
    productId: v.string(),
    rating: v.number(),
    title: v.string(),
    content: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    reviewId: v.optional(v.id("productReviews")),
  }),
  handler: async (ctx, args) => {
    try {
      const order = await lookupOrderByNumber(ctx, args.orderNumber);
      if (!order) {
        return {
          success: false,
          message: "Order not found. Please verify your order number.",
        };
      }

      const productId = args.productId as Id<"products">;
      const product = await ctx.db.get(productId);
      if (!product || !isProductActive(product)) {
        return { success: false, message: "Product not found." };
      }

      await assertReviewEligibility(ctx, {
        orderId: order._id,
        productId,
        customerEmail: args.customerEmail,
      });

      const rating = validateRating(args.rating);
      const title = validateReviewTitle(args.title);
      const content = validateReviewContent(args.content);
      const now = Date.now();

      const reviewId = await ctx.db.insert("productReviews", {
        productId,
        orderId: order._id,
        customerName: order.customerName,
        customerEmail: normalizeEmail(args.customerEmail),
        customerUserId: order.userId,
        rating,
        title,
        content,
        isVerifiedPurchase: true,
        isApproved: false,
        helpfulCount: 0,
        createdAt: now,
        updatedAt: now,
        aiAnalysisStatus: "pending",
      });

      await ctx.scheduler.runAfter(0, internal.reviewAiActions.processReview, {
        reviewId,
      });

      return {
        success: true,
        message: "Thank you! Your review has been submitted for approval.",
        reviewId,
      };
    } catch (error) {
      const message =
        error instanceof ConvexError
          ? (typeof error.data === "string" ? error.data : error.message)
          : error instanceof Error
            ? error.message
            : "Unable to submit review.";
      return { success: false, message };
    }
  },
});

export const requestHumanSupport = internalMutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.optional(v.string()),
    conversationTranscript: v.string(),
    conversationId: v.optional(v.id("vapiConversations")),
  },
  returns: v.object({
    success: v.boolean(),
    ticketId: v.id("vapiSupportTickets"),
  }),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const email = normalizeEmail(args.email);
    const transcript = args.conversationTranscript.trim();

    if (name.length < 2 || !isValidEmail(email) || transcript.length < 10) {
      throw new ConvexError("Please provide valid contact details and context.");
    }

    const ticketId = await ctx.db.insert("vapiSupportTickets", {
      name,
      email,
      phone: args.phone?.trim() || undefined,
      subject: args.subject?.trim() || "AI Assistant escalation",
      conversationTranscript: transcript,
      conversationId: args.conversationId,
      status: "open",
      createdAt: Date.now(),
    });

    await incrementDailyAnalytics(ctx, "humanEscalations");

    return { success: true, ticketId };
  },
});

export const getKnowledgeBase = internalQuery({
  args: { query: v.optional(v.string()) },
  returns: v.object({
    shippingPolicy: v.string(),
    returnPolicy: v.string(),
    storeInfo: v.object({
      address: v.string(),
      phone: v.string(),
      email: v.string(),
      businessHours: v.string(),
    }),
  }),
  handler: async (ctx) => {
    const [shippingPolicy, returnPolicy, address, phone, email, businessHours] =
      await Promise.all([
        getSettingValue(ctx, "shipping_policy"),
        getSettingValue(ctx, "return_policy"),
        getSettingValue(ctx, "address"),
        getSettingValue(ctx, "phone"),
        getSettingValue(ctx, "email"),
        getSettingValue(ctx, "business_hours"),
      ]);

    return {
      shippingPolicy,
      returnPolicy,
      storeInfo: { address, phone, email, businessHours },
    };
  },
});
