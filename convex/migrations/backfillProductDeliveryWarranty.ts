import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  DELIVERY_METHOD_LABELS,
  getDefaultDeliveryOptions,
  normalizeDeliveryOptions,
} from "../lib/productValidators";

/** Backfill warranty defaults and delivery options on products; delivery fields on orders. */
export const backfillProductDeliveryWarranty = internalMutation({
  args: {},
  returns: v.object({
    productsUpdated: v.number(),
    ordersUpdated: v.number(),
  }),
  handler: async (ctx) => {
    let productsUpdated = 0;
    let ordersUpdated = 0;

    const products = await ctx.db.query("products").collect();
    for (const product of products) {
      const patch: Record<string, unknown> = {};

      if (product.warrantyAvailable === undefined) {
        patch.warrantyAvailable = false;
      }
      if (!product.deliveryOptions?.length) {
        patch.deliveryOptions = getDefaultDeliveryOptions();
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(product._id, patch);
        productsUpdated += 1;
      }
    }

    const orders = await ctx.db.query("orders").collect();
    for (const order of orders) {
      if (order.deliveryMethod !== undefined) {
        continue;
      }

      await ctx.db.patch(order._id, {
        deliveryMethod: "standard",
        deliveryMethodLabel: DELIVERY_METHOD_LABELS.standard,
        deliveryCharge: 0,
        deliveryEstimate: "3-5 Business Days",
      });
      ordersUpdated += 1;
    }

    return { productsUpdated, ordersUpdated };
  },
});

export { normalizeDeliveryOptions, getDefaultDeliveryOptions };
