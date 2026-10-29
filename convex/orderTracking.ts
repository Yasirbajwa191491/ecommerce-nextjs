import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { buildTrackingBucketKey } from "./lib/rateLimit";
import {
  hasOrderAccess,
} from "./lib/orderAccess";
import {
  normalizeEmail,
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
    customerEmail: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<TrackByOrderNumberResult> => {
    const orderNumber = args.orderNumber.trim();
    const customerEmail = args.customerEmail?.trim();

    if (!orderNumber) {
      return notFound();
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey(
        "order",
        `${orderNumber}:${normalizeEmail(customerEmail ?? "anon")}`
      ),
    });
    if (!rateLimit.allowed) {
      return rateLimited();
    }

    const result = await ctx.runQuery(internal.orders.lookupOrderForTracking, {
      orderNumber,
    });

    if (!result) return notFound();

    const verified = hasOrderAccess(result.order, { accessToken: args.accessToken });
    if (!verified) return notFound();
    const accessToken = undefined;

    return {
      found: true,
      order: toPublicOrderDetail(
        { ...result.order, accessToken: accessToken ?? result.order.accessToken },
        result.items,
        result.statusHistory,
        result.promotions,
        { verified }
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
    // Discovery by contact knowledge is prohibited. Recovery verifies email possession first.
    void ctx; void args;
    return notFound();
  },
});

export const getPublicOrderDetail = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
    customerPhone: v.optional(v.string()),
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

    const verified = hasOrderAccess(result.order, { accessToken });
    if (!verified) return notFound();
    const ensuredToken = undefined;

    return {
      found: true,
      order: toPublicOrderDetail(
        { ...result.order, accessToken: ensuredToken ?? result.order.accessToken },
        result.items,
        result.statusHistory,
        result.promotions,
        { verified }
      ),
    };
  },
});
