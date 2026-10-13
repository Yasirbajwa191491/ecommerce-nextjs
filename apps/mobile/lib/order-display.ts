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
  if (method === "stripe") return "Card";
  return "—";
}

export function getOrderStatusLabel(status: OrderStatus): string {
  if (status === "pending") return "Received";
  if (status === "processing") return "Preparing";
  return formatOrderLabel(status);
}

export function getPaymentStatusLabel(status: PaymentStatus | string, method?: PaymentMethod | string, orderStatus?: OrderStatus): string {
  if (method === "cod" && status === "pending") {
    if (orderStatus === "cancelled" || orderStatus === "failed" || orderStatus === "expired") return "No payment due";
    return "Due on delivery";
  }
  if (status === "pending") return "Awaiting payment";
  return formatOrderLabel(status);
}

export const ORDER_PROGRESS_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "processing", label: "Preparing" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
];

export function getOrderProgressStepIndex(status: OrderStatus): number {
  return ORDER_PROGRESS_STEPS.findIndex((step) => step.key === status);
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
  status?: string;
}): string {
  if (order.status === "cancelled") return "Order cancelled";
  if (order.status === "refunded" || order.paymentStatus === "refunded") return "Order refunded";
  if (order.status === "expired") return "Checkout expired";
  if (order.paymentMethod === "stripe" && order.paymentStatus === "failed") {
    return "Payment failed";
  }
  if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") {
    return "Confirming payment";
  }
  if (order.status === "pending" || !order.status) return "Order received";
  if (order.status === "delivered") return "Order delivered";
  return "Order confirmed";
}

export function getCheckoutSuccessMessage(order: {
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
}): string {
  if (order.status === "cancelled") return "This order has been cancelled. View your order for payment and refund details.";
  if (order.status === "refunded" || order.paymentStatus === "refunded") return "View your order for refund details.";
  if (order.status === "expired") return "This checkout has expired. Return to your cart to place a new order.";
  if (order.paymentMethod === "stripe" && order.paymentStatus === "failed") {
    return "Your payment could not be completed. You can retry payment or return to your cart.";
  }
  if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") {
    return "We are confirming your payment with your bank. This usually takes a few seconds.";
  }
  if (order.paymentMethod === "cod") {
    return order.status === "pending"
      ? "We've received your order. Payment is due when it arrives."
      : "Your order is being prepared. Payment is due when it arrives.";
  }
  if (order.paymentStatus === "paid") {
    return order.status === "pending" ? "Payment received. Your order is awaiting store confirmation." : "Payment received. Follow your delivery progress below.";
  }
  return "Your order has been received.";
}

export function canRetryStripePayment(order: {
  paymentMethod?: string;
  paymentStatus?: string;
  status?: string;
}): boolean {
  if (order.paymentMethod !== "stripe") {
    return false;
  }
  if (order.paymentStatus === "pending" && order.status === "pending") {
    return true;
  }
  return (
    order.paymentStatus === "failed" &&
    (order.status === "failed" || order.status === "expired")
  );
}

export function formatOrderDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}
