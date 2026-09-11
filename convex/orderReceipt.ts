import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { buildTrackingBucketKey } from "./lib/rateLimit";
import { hasOrderAccess } from "./lib/orderAccess";
import { buildOrderReceiptDto, resolveReceiptEligibility } from "./lib/orderReceipt";

const NOT_FOUND = "We couldn't find an order matching your details.";

export const getOrderReceipt = action({
  args: {
    orderNumber: v.string(),
    customerEmail: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orderNumber = args.orderNumber.trim();
    const customerEmail = args.customerEmail?.trim();
    const accessToken = args.accessToken?.trim();

    if (!orderNumber || (!customerEmail && !accessToken)) {
      return { found: false as const, message: NOT_FOUND };
    }

    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey(
        "receipt",
        `${orderNumber}:${customerEmail ?? accessToken ?? "anon"}`
      ),
    });
    if (!rateLimit.allowed) {
      return {
        found: false as const,
        message: "Too many receipt requests. Please try again later.",
        rateLimited: true as const,
      };
    }

    const result = await ctx.runQuery(internal.orders.lookupPublicOrderDetail, {
      orderNumber,
    });
    if (!result) {
      return { found: false as const, message: NOT_FOUND };
    }

    const { order, items, promotions } = result;
    if (!hasOrderAccess(order, { customerEmail, accessToken })) {
      return { found: false as const, message: NOT_FOUND };
    }

    const eligibility = resolveReceiptEligibility(order);
    if (!eligibility.available) {
      return {
        found: false as const,
        message: "A receipt is not available for this order.",
      };
    }

    const branding = await ctx.runQuery(internal.settings.getPublicBranding, {});

    const receipt = buildOrderReceiptDto({
      order,
      items,
      promotions: promotions.map((promo: Doc<"orderPromotions">) => ({
        promotionName: promo.promotionName,
        promotionDescription: promo.promotionDescription,
        freeQuantity: promo.freeQuantity,
        savingsAmount: promo.savingsAmount,
      })),
      branding,
    });

    return { found: true as const, receipt };
  },
});
