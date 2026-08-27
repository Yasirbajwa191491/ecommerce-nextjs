import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { buildTrackingBucketKey } from "./lib/rateLimit";
import {
  emailsMatch,
} from "./lib/orderAccess";
import {
  normalizeEmail,
  normalizePhone,
  toPublicOrderDetail,
  toPublicOrderSummary,
  type PublicOrderDetail,
  type PublicOrderSummary,
} from "./lib/publicOrderDto";

const TRACKING_NOT_FOUND =
  "We couldn't find any orders matching your details.";

type TrackingNotFound = {
  found: false;
  message: string;
  rateLimited?: true;
};

type TrackByOrderNumberResult =
  | TrackingNotFound
  | { found: true; order: PublicOrderDetail };

type TrackByCustomerResult =
  | TrackingNotFound
  | { found: true; orders: PublicOrderSummary[] };

type PublicOrderDetailResult =
  | TrackingNotFound
  | { found: true; order: PublicOrderDetail };

function notFound(): TrackingNotFound {
  return { found: false, message: TRACKING_NOT_FOUND };
}

function rateLimited(): TrackingNotFound {
  return {
    found: false,
    message: "Too many lookup attempts. Please try again later.",
    rateLimited: true,
  };
}

export const trackByOrderNumber = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.string(),
  },
  handler: async (ctx, args): Promise<TrackByOrderNumberResult> => {
    const orderNumber = args.orderNumber.trim();
    const customerEmail = args.customerEmail.trim();

    if (!orderNumber || !customerEmail) {
      return notFound();
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey("order", `${orderNumber}:${normalizeEmail(customerEmail)}`),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const result = await ctx.runQuery(internal.orders.lookupOrderForTracking, {
      orderNumber,
    });

    if (!result) return notFound();
    if (!emailsMatch(result.order.customerEmail, customerEmail)) {
      return notFound();
    }

    const accessToken = await ctx.runMutation(internal.orders.ensureOrderAccessToken, {
      orderId: result.order._id,
    });

    return {
      found: true,
      order: toPublicOrderDetail(
        { ...result.order, accessToken: accessToken ?? result.order.accessToken },
        result.items,
        result.statusHistory,
        result.promotions,
        { verified: true }
      ),
    };
  },
});

export const trackByCustomer = action({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TrackByCustomerResult> => {
    const email = args.email?.trim() ? normalizeEmail(args.email) : undefined;
    const phone = args.phone?.trim() ? normalizePhone(args.phone) : undefined;

    if (!email && !phone) {
      return notFound();
    }

    const identifier = email ?? phone!;
    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey("customer", identifier),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const orders = await ctx.runQuery(internal.orders.lookupOrdersByCustomer, {
      email,
      phone: args.phone?.trim(),
    });

    if (!orders.length) return notFound();

    return {
      found: true,
      orders: orders.map((order: Doc<"orders">) => toPublicOrderSummary(order)),
    };
  },
});

export const getPublicOrderDetail = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PublicOrderDetailResult> => {
    const orderNumber = args.orderNumber.trim();
    const customerEmail = args.customerEmail?.trim();
    const accessToken = args.accessToken?.trim();

    if (!orderNumber) {
      return notFound();
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey(
        "detail",
        `${orderNumber}:${normalizeEmail(customerEmail ?? accessToken ?? "anon")}`
      ),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const result = await ctx.runQuery(internal.orders.lookupPublicOrderDetail, {
      orderNumber,
    });

    if (!result) return notFound();

    const verified =
      (customerEmail && emailsMatch(result.order.customerEmail, customerEmail)) ||
      (accessToken && result.order.accessToken === accessToken);

    if (!verified) {
      return notFound();
    }

    const ensuredToken = await ctx.runMutation(internal.orders.ensureOrderAccessToken, {
      orderId: result.order._id,
    });

    return {
      found: true,
      order: toPublicOrderDetail(
        { ...result.order, accessToken: ensuredToken ?? result.order.accessToken },
        result.items,
        result.statusHistory,
        result.promotions,
        { verified: true }
      ),
    };
  },
});
