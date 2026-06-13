"use node";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendOrderConfirmationNotifications = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.runAction(internal.email.sendOrderConfirmation, {
      orderId: args.orderId,
    });
    await ctx.runAction(internal.sms.sendOrderConfirmationSms, {
      orderId: args.orderId,
    });
    return null;
  },
});
