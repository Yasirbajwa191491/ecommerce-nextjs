"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/** @deprecated Use orderNotifications.emitOrderNotificationEvent instead. */
export const sendOrderConfirmationNotifications = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.orderNotifications.emitOrderNotificationEvent, {
      orderId: args.orderId,
      event: "order.created",
    });
    return null;
  },
});
