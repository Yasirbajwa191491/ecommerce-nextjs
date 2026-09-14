import type { OrderNotificationEvent } from "./notificationTypes";

export type SmsOrderItem = {
  productName: string;
  color: string;
  quantity: number;
  lineTotal: number;
};

export type SmsPaymentMethod = "cod" | "stripe";
export type SmsPaymentStatus = "pending" | "paid" | "failed" | "refunded";

/** Events that send customer SMS when `sms_order_confirmation_enabled` is on. */
export const SMS_ORDER_EVENTS = [
  "order.created",
  "payment.succeeded",
  "order.confirmed",
  "order.processing",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "order.refunded",
] as const satisfies ReadonlyArray<OrderNotificationEvent>;

export type SmsOrderEvent = (typeof SMS_ORDER_EVENTS)[number];

const SMS_ORDER_EVENT_SET = new Set<OrderNotificationEvent>(SMS_ORDER_EVENTS);

/** Twilio prepends this on trial accounts — reserve space so the full SMS stays in 1 segment. */
export const TWILIO_TRIAL_PREFIX_RESERVE = 40;
export const GSM_SINGLE_SEGMENT_LIMIT = 160;
export const DEFAULT_MAX_SMS_BODY_LENGTH =
  GSM_SINGLE_SEGMENT_LIMIT - TWILIO_TRIAL_PREFIX_RESERVE;

export function isSmsOrderEvent(
  event: OrderNotificationEvent
): event is SmsOrderEvent {
  return SMS_ORDER_EVENT_SET.has(event);
}

export function shouldSendSmsForEvent(event: OrderNotificationEvent): boolean {
  return isSmsOrderEvent(event);
}

/**
 * Confirmation SMS is queued on COD `order.created` or Stripe `payment.succeeded`.
 * Do not promise a text for unpaid or failed card checkouts.
 */
export function willSendOrderConfirmationSms(args: {
  smsEnabled: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
}): boolean {
  if (!args.smsEnabled) return false;
  if (args.paymentMethod === "cod") return true;
  return args.paymentMethod === "stripe" && args.paymentStatus === "paid";
}

export function resolveMaxSmsBodyLength(envValue?: string): number {
  if (envValue) {
    const parsed = Number.parseInt(envValue, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_MAX_SMS_BODY_LENGTH;
}

export function formatSmsMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function truncateSmsText(text: string, maxLength: number) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  if (maxLength <= 3) return trimmed.slice(0, maxLength);
  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

export function shortenTrackUrl(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export function buildTrackOrderUrl(appUrl: string, orderNumber: string) {
  return `${appUrl.replace(/\/$/, "")}/track-order/${encodeURIComponent(orderNumber)}`;
}

function firstNameFrom(customerName: string) {
  return truncateSmsText(customerName.trim().split(/\s+/)[0] ?? customerName, 12);
}

function pickSmsBody(candidates: string[], maxLength: number) {
  const body =
    candidates.find((candidate) => candidate.length <= maxLength) ??
    truncateSmsText(candidates[candidates.length - 1]!, maxLength);
  return body.length > maxLength ? truncateSmsText(body, maxLength) : body;
}

function formatItemsCompact(items: SmsOrderItem[], currency: string) {
  if (items.length === 0) {
    return "see email for items";
  }

  if (items.length === 1) {
    const item = items[0]!;
    const name = truncateSmsText(item.productName, 20);
    const price = formatSmsMoney(item.lineTotal, currency);
    return `${item.quantity}x ${name} (${price})`;
  }

  const first = items[0]!;
  const name = truncateSmsText(first.productName, 16);
  const extra = items.length - 1;
  return `${items.length} items incl. ${first.quantity}x ${name}${extra > 0 ? ` +${extra}` : ""}`;
}

function paymentShort(
  paymentMethod: SmsPaymentMethod,
  paymentStatus: SmsPaymentStatus
) {
  if (paymentMethod === "cod") return "COD";
  if (paymentStatus === "paid") return "Paid";
  return "Processing";
}

export function buildOrderConfirmationSmsBody(args: {
  customerName: string;
  orderNumber: string;
  total: number;
  currency: string;
  paymentMethod: SmsPaymentMethod;
  paymentStatus: SmsPaymentStatus;
  trackOrderUrl: string;
  items: SmsOrderItem[];
  maxLength?: number;
}) {
  const maxLength = args.maxLength ?? DEFAULT_MAX_SMS_BODY_LENGTH;
  const firstName = firstNameFrom(args.customerName);
  const total = formatSmsMoney(args.total, args.currency);
  const payment = paymentShort(args.paymentMethod, args.paymentStatus);
  const itemsSummary = formatItemsCompact(args.items, args.currency);
  const shortTrackUrl = shortenTrackUrl(args.trackOrderUrl);

  return pickSmsBody(
    [
      `Hi ${firstName}, your ${args.orderNumber} order is confirmed. ${itemsSummary}. Total ${total} (${payment}). Track: ${shortTrackUrl}`,
      `Hi ${firstName}, order ${args.orderNumber} confirmed. ${itemsSummary}. Total ${total} (${payment}).`,
      `Order ${args.orderNumber} confirmed. ${itemsSummary}. Total ${total}. ${payment}.`,
      `${args.orderNumber}: ${itemsSummary}. Total ${total}.`,
    ],
    maxLength
  );
}

export function buildOrderStatusSmsBody(args: {
  event: Exclude<SmsOrderEvent, "order.created" | "payment.succeeded">;
  customerName: string;
  orderNumber: string;
  trackOrderUrl: string;
  cancellationReason?: string;
  trackingInfo?: string;
  maxLength?: number;
}) {
  const maxLength = args.maxLength ?? DEFAULT_MAX_SMS_BODY_LENGTH;
  const firstName = firstNameFrom(args.customerName);
  const shortTrackUrl = shortenTrackUrl(args.trackOrderUrl);

  switch (args.event) {
    case "order.confirmed":
      return pickSmsBody(
        [
          `Hi ${firstName}, your ${args.orderNumber} has been confirmed. Track: ${shortTrackUrl}`,
          `Hi ${firstName}, ${args.orderNumber} has been confirmed.`,
          `${args.orderNumber} has been confirmed.`,
        ],
        maxLength
      );
    case "order.processing":
      return pickSmsBody(
        [
          `Hi ${firstName}, your ${args.orderNumber} is being prepared. Track: ${shortTrackUrl}`,
          `Hi ${firstName}, ${args.orderNumber} is being prepared.`,
          `${args.orderNumber} is being prepared.`,
        ],
        maxLength
      );
    case "order.shipped": {
      const tracking = args.trackingInfo?.trim();
      return pickSmsBody(
        tracking
          ? [
              `Hi ${firstName}, your ${args.orderNumber} has shipped. ${truncateSmsText(tracking, 40)} Track: ${shortTrackUrl}`,
              `Hi ${firstName}, ${args.orderNumber} has shipped. Track: ${shortTrackUrl}`,
              `${args.orderNumber} has shipped.`,
            ]
          : [
              `Hi ${firstName}, your ${args.orderNumber} has shipped. Track: ${shortTrackUrl}`,
              `Hi ${firstName}, ${args.orderNumber} has shipped.`,
              `${args.orderNumber} has shipped.`,
            ],
        maxLength
      );
    }
    case "order.delivered":
      return pickSmsBody(
        [
          `Hi ${firstName}, your ${args.orderNumber} has been delivered.`,
          `${args.orderNumber} has been delivered.`,
        ],
        maxLength
      );
    case "order.cancelled": {
      const reason = args.cancellationReason?.trim();
      return pickSmsBody(
        reason
          ? [
              `Hi ${firstName}, your ${args.orderNumber} has been cancelled. ${truncateSmsText(reason, 40)}`,
              `Hi ${firstName}, ${args.orderNumber} has been cancelled.`,
              `${args.orderNumber} has been cancelled.`,
            ]
          : [
              `Hi ${firstName}, your ${args.orderNumber} has been cancelled.`,
              `${args.orderNumber} has been cancelled.`,
            ],
        maxLength
      );
    }
    case "order.refunded":
      return pickSmsBody(
        [
          `Hi ${firstName}, your refund for ${args.orderNumber} has been processed.`,
          `${args.orderNumber} refund has been processed.`,
        ],
        maxLength
      );
    default: {
      const _exhaustive: never = args.event;
      return _exhaustive;
    }
  }
}

export type BuildOrderSmsBodyArgs = {
  event: OrderNotificationEvent;
  customerName: string;
  orderNumber: string;
  total: number;
  currency: string;
  paymentMethod: SmsPaymentMethod;
  paymentStatus: SmsPaymentStatus;
  trackOrderUrl: string;
  items: SmsOrderItem[];
  cancellationReason?: string;
  trackingInfo?: string;
  maxLength?: number;
};

export function buildOrderSmsBody(args: BuildOrderSmsBodyArgs): string | null {
  if (!isSmsOrderEvent(args.event)) {
    return null;
  }

  if (args.event === "order.created" || args.event === "payment.succeeded") {
    return buildOrderConfirmationSmsBody(args);
  }

  return buildOrderStatusSmsBody({
    event: args.event,
    customerName: args.customerName,
    orderNumber: args.orderNumber,
    trackOrderUrl: args.trackOrderUrl,
    cancellationReason: args.cancellationReason,
    trackingInfo: args.trackingInfo,
    maxLength: args.maxLength,
  });
}
