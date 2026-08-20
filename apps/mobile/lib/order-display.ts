export type OrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "failed"
  | "expired";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod = "cod" | "stripe";

export function formatOrderLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getPaymentMethodLabel(method: PaymentMethod | string | undefined): string {
  if (method === "cod") return "Cash on delivery";
  if (method === "stripe") return "Card (Stripe)";
  return "—";
}

export function getOrderStatusBadgeVariant(
  status: OrderStatus
): "default" | "primary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "confirmed":
    case "shipped":
    case "delivered":
      return "success";
    case "processing":
      return "primary";
    case "cancelled":
    case "refunded":
    case "failed":
    case "expired":
      return "destructive";
    default:
      return "warning";
  }
}

export function getPaymentStatusBadgeVariant(
  status: PaymentStatus
): "default" | "primary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "paid":
      return "success";
    case "failed":
      return "destructive";
    case "refunded":
      return "primary";
    default:
      return "warning";
  }
}

export function getCheckoutSuccessTitle(order: {
  paymentMethod?: string;
  paymentStatus?: string;
}): string {
  if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") {
    return "Payment processing";
  }
  return "Order confirmed!";
}

export function getCheckoutSuccessMessage(order: {
  paymentMethod?: string;
  paymentStatus?: string;
}): string {
  if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") {
    return "We are confirming your payment. This may take a moment.";
  }
  if (order.paymentMethod === "cod") {
    return "Your order has been placed. Please prepare payment on delivery.";
  }
  if (order.paymentStatus === "paid") {
    return "Your payment was successful and your order is confirmed.";
  }
  return "Your order has been received.";
}

export function formatOrderDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
