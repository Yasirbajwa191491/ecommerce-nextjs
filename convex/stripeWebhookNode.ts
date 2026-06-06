"use node";

import Stripe from "stripe";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel";
import type { GenericActionCtx } from "convex/server";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

async function resolveOrderId(
  ctx: GenericActionCtx<DataModel>,
  event: Stripe.Event
): Promise<Id<"orders"> | null> {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId as Id<"orders"> | undefined;
    if (orderId) return orderId;

    if (session.id) {
      const order = await ctx.runQuery(internal.orders.getOrderByStripeSession, {
        stripeSessionId: session.id,
      });
      return order?._id ?? null;
    }
  }

  if (
    event.type === "payment_intent.succeeded" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId as Id<"orders"> | undefined;
    if (orderId) return orderId;

    if (paymentIntent.id) {
      const order = await ctx.runQuery(internal.orders.getOrderByPaymentIntent, {
        stripePaymentIntentId: paymentIntent.id,
      });
      return order?._id ?? null;
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (paymentIntentId) {
      const order = await ctx.runQuery(internal.orders.getOrderByPaymentIntent, {
        stripePaymentIntentId: paymentIntentId,
      });
      return order?._id ?? null;
    }
  }

  return null;
}

function extractTransactionId(
  paymentIntent: Stripe.PaymentIntent | string | null | undefined,
  stripe: Stripe
): Promise<string | undefined> {
  if (!paymentIntent) return Promise.resolve(undefined);
  if (typeof paymentIntent === "string") {
    return stripe.paymentIntents
      .retrieve(paymentIntent)
      .then((pi) => {
        const charge = pi.latest_charge;
        return typeof charge === "string" ? charge : charge?.id;
      })
      .catch(() => undefined);
  }
  const charge = paymentIntent.latest_charge;
  return Promise.resolve(typeof charge === "string" ? charge : charge?.id);
}

export const processWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[stripe] STRIPE_WEBHOOK_SECRET is not configured");
      return { status: 500, body: JSON.stringify({ error: "Webhook secret not configured" }) };
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret
      );
    } catch (error) {
      console.error("[stripe] Webhook signature verification failed:", error);
      return { status: 400, body: JSON.stringify({ error: "Invalid signature" }) };
    }

    const orderId = await resolveOrderId(ctx, event);
    const { duplicate } = await ctx.runMutation(internal.orders.recordWebhookEvent, {
      eventId: event.id,
      type: event.type,
      orderId: orderId ?? undefined,
      payloadSummary: JSON.stringify({
        livemode: event.livemode,
        objectId: (event.data.object as { id?: string }).id,
      }),
    });

    if (duplicate) {
      console.log(`[stripe] Duplicate webhook event ${event.id} — skipping`);
      return {
        status: 200,
        body: JSON.stringify({ received: true, duplicate: true }),
      };
    }

    console.log(`[stripe] Processing webhook ${event.type} (${event.id})`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const resolvedOrderId =
          orderId ??
          ((session.metadata?.orderId as Id<"orders"> | undefined) ?? null);
        if (resolvedOrderId && session.payment_status === "paid") {
          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id;
          const stripeTransactionId = paymentIntentId
            ? await extractTransactionId(paymentIntentId, stripe)
            : undefined;
          await ctx.runMutation(internal.orders.markOrderPaid, {
            orderId: resolvedOrderId,
            stripePaymentIntentId: paymentIntentId,
            stripeSessionId: session.id,
            stripeTransactionId,
            paidTotalCents: session.amount_total ?? undefined,
          });
        }
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const resolvedOrderId =
          orderId ??
          ((paymentIntent.metadata?.orderId as Id<"orders"> | undefined) ?? null);
        if (resolvedOrderId) {
          const stripeTransactionId =
            typeof paymentIntent.latest_charge === "string"
              ? paymentIntent.latest_charge
              : paymentIntent.latest_charge?.id;
          await ctx.runMutation(internal.orders.markOrderPaid, {
            orderId: resolvedOrderId,
            stripePaymentIntentId: paymentIntent.id,
            stripeTransactionId,
          });
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const resolvedOrderId =
          orderId ??
          ((paymentIntent.metadata?.orderId as Id<"orders"> | undefined) ?? null);
        if (resolvedOrderId) {
          await ctx.runMutation(internal.orders.markOrderFailed, {
            orderId: resolvedOrderId,
            status: "failed",
            restoreInventory: true,
          });
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const resolvedOrderId =
          orderId ??
          ((session.metadata?.orderId as Id<"orders"> | undefined) ?? null);
        if (resolvedOrderId) {
          await ctx.runMutation(internal.orders.markOrderFailed, {
            orderId: resolvedOrderId,
            status: "expired",
            restoreInventory: true,
          });
        }
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        const resolvedOrderId = orderId;
        if (resolvedOrderId) {
          await ctx.runMutation(internal.orders.markOrderRefunded, {
            orderId: resolvedOrderId,
            stripeTransactionId: charge.id,
            stripePaymentIntentId: paymentIntentId,
          });
        }
        break;
      }
      default:
        console.log(`[stripe] Unhandled event type: ${event.type}`);
    }

    return { status: 200, body: JSON.stringify({ received: true }) };
  },
});
