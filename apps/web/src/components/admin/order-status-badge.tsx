"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/order";

const ORDER_STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "outline",
  confirmed: "default",
  shipped: "default",
  delivered: "default",
  cancelled: "destructive",
  refunded: "destructive",
  failed: "destructive",
  expired: "destructive",
};

const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  paid: "default",
  failed: "destructive",
  refunded: "outline",
};

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge variant={ORDER_STATUS_VARIANT[status]} className={cn(className)}>
      {formatLabel(status)}
    </Badge>
  );
}

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status]} className={cn(className)}>
      {formatLabel(status)}
    </Badge>
  );
}

export function PaymentMethodBadge({
  method,
  className,
}: {
  method: PaymentMethod;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(className)}>
      {method === "cod" ? "Cash On Delivery" : "Stripe"}
    </Badge>
  );
}
