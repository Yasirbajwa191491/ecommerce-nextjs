import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import {
  customerInfoValidator,
  validateCartLines,
  validateCustomerFields,
} from "../lib/checkoutValidation";

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
  },
  returns: v.object({
    checkoutUrl: v.string(),
    orderNumber: v.string(),
    total: v.number(),
    currency: v.string(),
    paymentMethod: v.literal("stripe"),
    message: v.string(),
  }),
  handler: async (ctx, args): Promise<{
    checkoutUrl: string;
    orderNumber: string;
    total: number;
    currency: string;
    paymentMethod: "stripe";
    message: string;
  }> => {
    const lines: CartLine[] = await ctx.runQuery(
      internal.vapi.shoppingTools.getCartLines,
      { conversationId: args.conversationId }
    );
    validateCartLines(lines);
    validateCustomerFields(args.customer);

    const session: {
      url: string;
      orderNumber: string;
      total: number;
      currency: string;
    } = await ctx.runAction(internal.stripe.createCheckoutSessionForVoice, {
      lines,
      customer: args.customer,
      idempotencyKey: args.idempotencyKey,
    });

    await ctx.runMutation(internal.vapi.shoppingTools.clearCartAfterCheckout, {
      conversationId: args.conversationId,
    });
    await ctx.runMutation(internal.vapi.logging.incrementAnalytics, {
      field: "checkoutStarts",
    });

    return {
      checkoutUrl: session.url,
      orderNumber: session.orderNumber,
      total: session.total,
      currency: session.currency,
      paymentMethod: "stripe" as const,
      message: `Checkout ready!\nOrder number: ${session.orderNumber}\nTotal: ${session.currency} ${session.total.toFixed(2)}\nPayment: Card (Stripe)\nComplete payment at the checkout link.`,
    };
  },
});
