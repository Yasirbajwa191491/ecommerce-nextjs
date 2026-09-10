type NotificationEventType =
  | "order.created"
  | "payment.succeeded"
  | "payment.failed"
  | "order.confirmed"
  | "order.processing"
  | "order.shipped"
  | "order.delivered"
  | "order.cancelled"
  | "order.refunded"
  | "payment.received"
  | "order.recovery.reminder"
  | "order.expired";

const EVENT_ICONS: Record<NotificationEventType, string> = {
  "order.created": "receipt-outline",
  "payment.succeeded": "card-outline",
  "payment.failed": "alert-circle-outline",
  "order.confirmed": "checkmark-circle-outline",
  "order.processing": "construct-outline",
  "order.shipped": "airplane-outline",
  "order.delivered": "home-outline",
  "order.cancelled": "close-circle-outline",
  "order.refunded": "return-down-back-outline",
  "payment.received": "cash-outline",
  "order.recovery.reminder": "time-outline",
  "order.expired": "timer-outline",
};

export function getNotificationIcon(type: string): string {
  return EVENT_ICONS[type as NotificationEventType] ?? "notifications-outline";
}

export function formatNotificationTimestamp(createdAt: number): string {
  const date = new Date(createdAt);
  const now = Date.now();
  const diffMs = now - createdAt;

  if (diffMs < 60_000) return "Just now";
  if (diffMs < 3_600_000) return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
