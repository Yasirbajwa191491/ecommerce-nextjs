import type { Doc } from "../_generated/dataModel";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";
import {
  normalizeOrderDiscountTotal,
  normalizeOrderItem,
  type NormalizedOrderItem,
} from "./orderItemSnapshot";

export type PublicOrderItem = NormalizedOrderItem;

export type PublicOrderSummary = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  discountTotal: number;
  shipping: number;
  currency: string;
  createdAt: number;
  updatedAt: number;
  paidAt?: number;
};

export type PublicOrderPromotion = {
  promotionName: string;
  promotionDescription?: string;
  freeQuantity: number;
  savingsAmount: number;
};

export type PublicOrderDetail = PublicOrderSummary & {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  subtotal: number;
  tax: number;
  items: PublicOrderItem[];
  promotions: PublicOrderPromotion[];
  statusHistory: Array<{
    event: string;
    description: string;
    previousStatus?: OrderStatus;
    newStatus?: OrderStatus;
    createdAt: number;
  }>;
};

export function toPublicOrderItem(item: Doc<"orderItems">): PublicOrderItem {
  return normalizeOrderItem(item);
}

export function toPublicOrderSummary(
  order: Doc<"orders">,
  items: Doc<"orderItems">[] = []
): PublicOrderSummary {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    total: order.total,
    discountTotal: normalizeOrderDiscountTotal(order, items),
    shipping: order.shipping,
    currency: order.currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paidAt: order.paidAt,
  };
}

export function toPublicOrderPromotion(
  promo: Doc<"orderPromotions">
): PublicOrderPromotion {
  return {
    promotionName: promo.promotionName,
    promotionDescription: promo.promotionDescription,
    freeQuantity: promo.freeQuantity,
    savingsAmount: promo.savingsAmount,
  };
}

export function toPublicOrderDetail(
  order: Doc<"orders">,
  items: Doc<"orderItems">[],
  statusHistory: PublicOrderDetail["statusHistory"],
  promotions: Doc<"orderPromotions">[] = []
): PublicOrderDetail {
  return {
    ...toPublicOrderSummary(order, items),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    subtotal: order.subtotal,
    tax: order.tax,
    items: items.map(toPublicOrderItem),
    promotions: promotions.map(toPublicOrderPromotion),
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
