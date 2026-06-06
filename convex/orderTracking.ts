import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { buildTrackingBucketKey } from "./lib/rateLimit";
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
  },
  handler: async (ctx, args): Promise<TrackByOrderNumberResult> => {
    const orderNumber = args.orderNumber.trim();

    if (!orderNumber) {
      return notFound();
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey("order", orderNumber),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const result = await ctx.runQuery(internal.orders.lookupOrderForTracking, {
      orderNumber,
    });

    if (!result) return notFound();

    return {
      found: true,
      order: toPublicOrderDetail(
        result.order,
        result.items,
        result.statusHistory
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
      orders: orders.map(toPublicOrderSummary),
    };
  },
});

export const getPublicOrderDetail = action({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args): Promise<PublicOrderDetailResult> => {
    const orderNumber = args.orderNumber.trim();

    if (!orderNumber) {
      return notFound();
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey("detail", orderNumber),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const result = await ctx.runQuery(internal.orders.lookupPublicOrderDetail, {
      orderNumber,
    });

    if (!result) return notFound();

    return {
      found: true,
      order: toPublicOrderDetail(
        result.order,
        result.items,
        result.statusHistory
      ),
    };
  },
});
