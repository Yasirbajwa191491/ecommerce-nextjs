import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  customerInfoValidator,
  validateCartLines,
  validateCustomerFields,
} from "../lib/checkoutValidation";
import { deliveryMethodTypeValidator } from "../lib/productValidators";
import { formatVoiceOrderConfirmationDelivery } from "./voiceDeliveryHelpers";

type CartLine = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

export const createCheckoutSession = internalAction({
  args: {
    conversationId: v.id("vapiConversations"),
    customer: customerInfoValidator,
    idempotencyKey: v.string(),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
  },
  returns: v.object({
    checkoutUrl: v.string(),
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
    paymentMethod: v.literal("stripe"),
    deliveryMethod: v.optional(deliveryMethodTypeValidator),
    deliveryMethodLabel: v.optional(v.string()),
    deliveryCharge: v.optional(v.number()),
    shipping: v.optional(v.number()),
    deliveryEstimate: v.optional(v.string()),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    checkoutUrl: string;
    orderNumber: string;
    total: number;
    currency: string;
    paymentMethod: "stripe";
    deliveryMethod?: import("../lib/productValidators").DeliveryMethodType;
    deliveryMethodLabel?: string;
    deliveryCharge?: number;
    shipping?: number;
    deliveryEstimate?: string;
    message: string;
  }> => {
    const lines: CartLine[] = await ctx.runQuery(
      internal.vapi.shoppingTools.getCartLines,
      { conversationId: args.conversationId }
    );
    validateCartLines(lines);
    validateCustomerFields(args.customer);

    const session = await ctx.runAction(
      internal.stripe.createCheckoutSessionForVoice,
      {
        lines,
        customer: args.customer,
        idempotencyKey: args.idempotencyKey,
        deliveryMethod: args.deliveryMethod,
      }
    );

    await ctx.runMutation(internal.vapi.shoppingTools.clearCartAfterCheckout, {
      conversationId: args.conversationId,
    });
    await ctx.runMutation(internal.vapi.logging.incrementAnalytics, {
      field: "checkoutStarts",
    });

    await ctx.runMutation(internal.vapi.logging.setPendingVoiceCheckout, {
      conversationId: args.conversationId,
      checkoutUrl: session.url,
      orderNumber: session.orderNumber,
      total: session.total,
      currency: session.currency,
    });

    const deliveryMessage = formatVoiceOrderConfirmationDelivery({
      deliveryMethod: session.deliveryMethod,
      deliveryMethodLabel: session.deliveryMethodLabel,
      deliveryEstimate: session.deliveryEstimate,
      deliveryCharge: session.deliveryCharge,
      shipping: session.shipping,
      currency: session.currency,
    });

    return {
      checkoutUrl: session.url,
      orderNumber: session.orderNumber,
      total: session.total,
      currency: session.currency,
      paymentMethod: "stripe" as const,
      deliveryMethod: session.deliveryMethod,
      deliveryMethodLabel: session.deliveryMethodLabel,
      deliveryCharge: session.deliveryCharge,
      shipping: session.shipping,
      deliveryEstimate: session.deliveryEstimate,
      message: `Checkout ready!\nOrder number: ${session.orderNumber}\nTotal: ${session.currency} ${session.total.toFixed(2)}${deliveryMessage ? `\n${deliveryMessage}` : ""}\nPayment: Card (Stripe)\nComplete payment at the checkout link.`,
    };
  },
});
