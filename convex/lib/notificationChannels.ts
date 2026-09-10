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

  switch (event) {
    case "order.created":
    case "order.confirmed":
    case "order.processing":
    case "order.shipped":
    case "order.delivered":
    case "order.cancelled":
    case "order.refunded":
    case "order.expired":
      return preferences.orderUpdates;
    case "payment.succeeded":
    case "payment.failed":
    case "payment.received":
    case "order.recovery.reminder":
      return preferences.paymentUpdates;
    default:
      return preferences.orderUpdates;
  }
}
