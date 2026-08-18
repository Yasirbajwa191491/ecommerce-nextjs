import type { OrderStatus } from "@/types/order";

export const ORDER_STATUS_FILTER_OPTIONS: {
  value: OrderStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "confirmed", label: "Confirmed" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
];
