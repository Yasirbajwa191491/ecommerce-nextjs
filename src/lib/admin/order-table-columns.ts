import type { AdminColumnDef } from "@/lib/admin/column-visibility";

export const ORDER_TABLE_COLUMNS: AdminColumnDef[] = [
  { id: "orderNumber", label: "Order Number", locked: true },
  { id: "customerName", label: "Customer Name" },
  { id: "customerEmail", label: "Customer Email" },
  { id: "customerPhone", label: "Customer Phone" },
  { id: "total", label: "Total Amount" },
  { id: "paymentMethod", label: "Payment Method" },
  { id: "paymentStatus", label: "Payment Status" },
  { id: "status", label: "Order Status" },
  { id: "createdAt", label: "Created Date" },
  { id: "actions", label: "Actions", locked: true },
];

export const ORDER_COLUMNS_STORAGE_KEY = "admin-orders-column-visibility";

export type OrderSort = "newest" | "oldest" | "highest_amount" | "lowest_amount";

export const ORDER_SORT_OPTIONS: { value: OrderSort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest_amount", label: "Highest amount" },
  { value: "lowest_amount", label: "Lowest amount" },
];
