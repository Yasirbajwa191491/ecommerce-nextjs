import type { NotificationChannel, OrderNotificationEvent } from "./notificationTypes";

const EVENT_CHANNELS: Record<OrderNotificationEvent, NotificationChannel[]> = {
  "order.created": ["push", "email", "sms"],
  "payment.succeeded": ["push", "email", "sms"],
  "payment.failed": ["push"],
  "order.confirmed": ["push"],
  "order.processing": ["push"],
  "order.shipped": ["push"],
  "order.delivered": ["push"],
  "order.cancelled": ["push"],
  "order.refunded": ["push"],
  "payment.received": ["push"],
  "order.recovery.reminder": ["push", "email"],
  "order.expired": ["push"],
};

export function getChannelsForEvent(
  event: OrderNotificationEvent
): NotificationChannel[] {
  return EVENT_CHANNELS[event];
}

const TRANSACTIONAL_PUSH_EVENTS = new Set<OrderNotificationEvent>([
  "payment.succeeded",
  "payment.failed",
  "payment.received",
  "order.recovery.reminder",
  "order.expired",
]);

export function shouldSendPushForEvent(
  event: OrderNotificationEvent,
  preferences: {
    orderUpdates: boolean;
    paymentUpdates: boolean;
    promotionalNotifications: boolean;
  }
): boolean {
  if (!getChannelsForEvent(event).includes("push")) {
    return false;
  }

  if (TRANSACTIONAL_PUSH_EVENTS.has(event)) {
    return true;
  }

  switch (event) {
    case "order.created":
    case "order.confirmed":
    case "order.processing":
    case "order.shipped":
    case "order.delivered":
    case "order.cancelled":
    case "order.refunded":
      return preferences.orderUpdates;
    default:
      return preferences.orderUpdates;
  }
}
