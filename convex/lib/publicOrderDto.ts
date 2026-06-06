import type { Doc } from "../_generated/dataModel";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";

export type PublicOrderItem = {
  productName: string;
  color: string;
  sku?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
};

export type PublicOrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
};

export type PublicOrderDetail = PublicOrderSummary & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  shipping: number;
  items: PublicOrderItem[];
  statusHistory: Array<{
    event: string;
    description: string;
    previousStatus?: OrderStatus;
    newStatus?: OrderStatus;
    createdAt: number;
  }>;
};

export function toPublicOrderItem(item: Doc<"orderItems">): PublicOrderItem {
  return {
    productName: item.productName,
    color: item.color,
    sku: item.sku,
    size: item.size,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    imageUrl: item.imageUrl,
  };
}

export function toPublicOrderSummary(order: Doc<"orders">): PublicOrderSummary {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
  };
}

export function toPublicOrderDetail(
  order: Doc<"orders">,
  items: Doc<"orderItems">[],
  statusHistory: PublicOrderDetail["statusHistory"]
): PublicOrderDetail {
  return {
    ...toPublicOrderSummary(order),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    subtotal: order.subtotal,
    tax: order.tax,
    shipping: order.shipping,
    items: items.map(toPublicOrderItem),
    statusHistory,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function phonesMatch(stored: string, input: string): boolean {
  const a = normalizePhone(stored);
  const b = normalizePhone(input);
  if (!a || !b) return false;
  return a === b || a.endsWith(b) || b.endsWith(a);
}
