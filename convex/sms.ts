"use node";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import Twilio from "twilio";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getSiteUrl } from "./lib/siteUrl";
import { orderNotificationEventValidator } from "./lib/notificationTypes";
import {
  buildOrderSmsBody,
  buildTrackOrderUrl,
  resolveMaxSmsBodyLength,
  shouldSendSmsForEvent,
} from "./lib/orderSms";

function toE164(phone: string): string | null {
  const parsed = parsePhoneNumberFromString(phone.trim());
  if (!parsed?.isValid()) return null;
  return parsed.format("E.164");
}

function getTwilioCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!accountSid || !authToken || !fromNumber) {
    return {
      ok: false as const,
      reason:
        "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER not set in Convex env",
    };
  }

  if (!accountSid.startsWith("AC")) {
    return {
      ok: false as const,
      reason:
        "TWILIO_ACCOUNT_SID must start with AC (copy Account SID from Twilio Console → Account Info)",
    };
  }

  if (authToken.startsWith("AC") || authToken === accountSid) {
    return {
      ok: false as const,
      reason:
        "TWILIO_AUTH_TOKEN is invalid — it must be the Auth Token secret, not the Account SID. " +
        "In Twilio Console → Account Info, copy the Auth Token (click Show) and run: " +
        'npx convex env set TWILIO_AUTH_TOKEN "your_auth_token"',
    };
  }

  if (!fromNumber.startsWith("+")) {
    return {
      ok: false as const,
      reason:
        "TWILIO_PHONE_NUMBER must be E.164 format, e.g. +12792639504",
    };
  }

  return {
    ok: true as const,
    accountSid,
    authToken,
    fromNumber,
  };
}

function twilioAuthErrorMessage(error: unknown) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "number"
      ? error.code
      : undefined;

  if (status === 401 || code === 20003) {
    return (
      "Twilio authentication failed (401). TWILIO_AUTH_TOKEN is wrong or was rotated. " +
      "In Twilio Console → Account Info, copy the Auth Token (not Account SID) and update Convex: " +
      'npx convex env set TWILIO_AUTH_TOKEN "your_auth_token"'
    );
  }

  if (code === 30044) {
    return (
      "Twilio trial message length exceeded (30044). Message was shortened automatically; " +
      "upgrade your Twilio account to send longer SMS."
    );
  }

  return error instanceof Error ? error.message : "Unknown Twilio error";
}

export const sendOrderEventSms = internalAction({
  args: {
    orderId: v.id("orders"),
    event: orderNotificationEventValidator,
    cancellationReason: v.optional(v.string()),
    trackingInfo: v.optional(v.string()),
  },
  returns: v.object({
    sent: v.boolean(),
  }),
  handler: async (ctx, args) => {
    try {
      if (!shouldSendSmsForEvent(args.event)) {
        return { sent: false };
      }

      const smsEnabled = await ctx.runQuery(
        internal.settings.getSmsOrderConfirmationEnabled,
        {}
      );

      if (!smsEnabled) {
        console.log(
          `[orders] SMS disabled — skipping ${args.event} for order ${args.orderId}`
        );
        return { sent: false };
      }

      const credentials = getTwilioCredentials();
      if (!credentials.ok) {
        console.warn(
          `[orders] ${credentials.reason} — skipping SMS for order ${args.orderId}`
        );
        return { sent: false };
      }

      const { accountSid, authToken, fromNumber } = credentials;

      const orderData = await ctx.runQuery(internal.orders.getOrderForEmail, {
        orderId: args.orderId,
      });

      if (!orderData) {
        console.warn(`[orders] Order ${args.orderId} not found for SMS`);
        return { sent: false };
      }

      const { order, items } = orderData;

      if (!order.customerPhone.trim()) {
        console.warn(
          `[orders] No customer phone on order ${order.orderNumber} — skipping SMS`
        );
        return { sent: false };
      }

      const to = toE164(order.customerPhone);
      if (!to) {
        console.warn(
          `[orders] Invalid phone for order ${order.orderNumber} (${order.customerPhone}) — skipping SMS`
        );
        return { sent: false };
      }

      const body = buildOrderSmsBody({
        event: args.event,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        trackOrderUrl: buildTrackOrderUrl(getSiteUrl(), order.orderNumber),
        items: items.map((item: Doc<"orderItems">) => ({
          productName: item.productName,
          color: item.color,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        cancellationReason: args.cancellationReason,
        trackingInfo: args.trackingInfo,
        maxLength: resolveMaxSmsBodyLength(process.env.TWILIO_SMS_MAX_CHARS),
      });

      if (!body) {
        return { sent: false };
      }

      const client = Twilio(accountSid, authToken);
      const message = await client.messages.create({
        from: fromNumber,
        to,
        body,
      });

      console.log(
        `[orders] ${args.event} SMS sent (sid: ${message.sid ?? "unknown"}) → ${to}`
      );
      return { sent: true };
    } catch (error) {
      console.error(
        `[orders] ${args.event} SMS failed:`,
        twilioAuthErrorMessage(error)
      );
      return { sent: false };
    }
  },
});
