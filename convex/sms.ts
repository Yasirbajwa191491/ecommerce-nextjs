"use node";

import { parsePhoneNumberFromString } from "libphonenumber-js";
import Twilio from "twilio";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { v } from "convex/values";
import { getSiteUrl } from "./lib/siteUrl";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

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

type SmsOrderItem = {
  productName: string;
  color: string;
  quantity: number;
  lineTotal: number;
};

/** Twilio prepends this on trial accounts — reserve space so the full SMS stays in 1 segment. */
const TWILIO_TRIAL_PREFIX_RESERVE = 40;
const GSM_SINGLE_SEGMENT_LIMIT = 160;

function getMaxSmsBodyLength() {
  const configured = process.env.TWILIO_SMS_MAX_CHARS?.trim();
  if (configured) {
    const parsed = Number.parseInt(configured, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return GSM_SINGLE_SEGMENT_LIMIT - TWILIO_TRIAL_PREFIX_RESERVE;
}

function truncateText(text: string, maxLength: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 3) return trimmed.slice(0, maxLength);
  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function shortenTrackUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function formatItemsCompact(items: SmsOrderItem[], currency: string) {
  if (items.length === 0) {
    return "see email for items";
  }

  if (items.length === 1) {
    const item = items[0]!;
    const name = truncateText(item.productName, 20);
    const price = formatMoney(item.lineTotal, currency);
    return `${item.quantity}x ${name} (${price})`;
  }

  const first = items[0]!;
  const name = truncateText(first.productName, 16);
  const extra = items.length - 1;
  return `${items.length} items incl. ${first.quantity}x ${name}${extra > 0 ? ` +${extra}` : ""}`;
}

function paymentShort(
  paymentMethod: "cod" | "stripe",
  paymentStatus: "pending" | "paid" | "failed" | "refunded"
) {
  if (paymentMethod === "cod") return "COD";
  if (paymentStatus === "paid") return "Paid";
  return "Processing";
}

function buildSmsBody(args: {
  customerName: string;
  orderNumber: string;
  total: number;
  currency: string;
  paymentMethod: "cod" | "stripe";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  trackOrderUrl: string;
  items: SmsOrderItem[];
}) {
  const maxLength = getMaxSmsBodyLength();
  const firstName = truncateText(
    args.customerName.trim().split(/\s+/)[0] ?? args.customerName,
    12
  );
  const total = formatMoney(args.total, args.currency);
  const payment = paymentShort(args.paymentMethod, args.paymentStatus);
  const itemsSummary = formatItemsCompact(args.items, args.currency);
  const shortTrackUrl = shortenTrackUrl(args.trackOrderUrl);

  const candidates = [
    `Hi ${firstName}, your ${args.orderNumber} order is confirmed. ${itemsSummary}. Total ${total} (${payment}). Track: ${shortTrackUrl}`,
    `Hi ${firstName}, order ${args.orderNumber} confirmed. ${itemsSummary}. Total ${total} (${payment}).`,
    `Order ${args.orderNumber} confirmed. ${itemsSummary}. Total ${total}. ${payment}.`,
    `${args.orderNumber}: ${itemsSummary}. Total ${total}.`,
  ];

  const body =
    candidates.find((candidate) => candidate.length <= maxLength) ??
    truncateText(candidates[candidates.length - 1]!, maxLength);

  if (body.length > maxLength) {
    return truncateText(body, maxLength);
  }

  return body;
}

export const sendOrderConfirmationSms = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const smsEnabled = await ctx.runQuery(
        internal.settings.getSmsOrderConfirmationEnabled,
        {}
      );

      if (!smsEnabled) {
        console.log(
          `[orders] SMS order confirmation disabled — skipping for order ${args.orderId}`
        );
        return null;
      }

      const credentials = getTwilioCredentials();
      if (!credentials.ok) {
        console.warn(`[orders] ${credentials.reason} — skipping SMS for order ${args.orderId}`);
        return null;
      }

      const { accountSid, authToken, fromNumber } = credentials;

      const orderData = await ctx.runQuery(internal.orders.getOrderForEmail, {
        orderId: args.orderId,
      });

      if (!orderData) {
        console.warn(`[orders] Order ${args.orderId} not found for SMS`);
        return null;
      }

      const { order, items } = orderData;

      if (!order.customerPhone.trim()) {
        console.warn(
          `[orders] No customer phone on order ${order.orderNumber} — skipping SMS`
        );
        return null;
      }

      const to = toE164(order.customerPhone);
      if (!to) {
        console.warn(
          `[orders] Invalid phone for order ${order.orderNumber} (${order.customerPhone}) — skipping SMS`
        );
        return null;
      }

      const appUrl = getSiteUrl();
      const trackOrderUrl = `${appUrl}/track-order/${encodeURIComponent(order.orderNumber)}`;
      const body = buildSmsBody({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        trackOrderUrl,
        items: items.map((item: Doc<"orderItems">) => ({
          productName: item.productName,
          color: item.color,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
      });

      const client = Twilio(accountSid, authToken);
      const message = await client.messages.create({
        from: fromNumber,
        to,
        body,
      });

      console.log(
        `[orders] Confirmation SMS sent (sid: ${message.sid ?? "unknown"}) → ${to}`
      );
      return null;
    } catch (error) {
      console.error(
        "[orders] Order confirmation SMS failed:",
        twilioAuthErrorMessage(error)
      );
      return null;
    }
  },
});
