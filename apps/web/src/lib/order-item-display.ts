import type { PublicOrderItem } from "@/types/order";

type OrderItemLike = {
  unitPrice: number;
  lineTotal: number;
  quantity: number;
  originalUnitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  lineDiscountTotal?: number;
  finalUnitPrice?: number;
  shippingCharge?: number;
  lineShippingTotal?: number;
};

export function normalizeClientOrderItem(item: PublicOrderItem): PublicOrderItem {
  return normalizeOrderItemLike(item);
}

export function normalizeOrderItemLike<T extends OrderItemLike>(
  item: T
): T & {
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  shippingCharge: number;
  lineShippingTotal: number;
} {
  const finalUnitPrice = item.finalUnitPrice ?? item.unitPrice;
  const originalUnitPrice = item.originalUnitPrice ?? finalUnitPrice;
  const discountPercent = item.discountPercent ?? 0;
  const discountAmount = item.discountAmount ?? 0;
  const lineDiscountTotal =
    item.lineDiscountTotal ?? discountAmount * item.quantity;
  const shippingCharge = item.shippingCharge ?? 0;
  const lineShippingTotal = item.lineShippingTotal ?? shippingCharge;

  return {
    ...item,
    originalUnitPrice,
    discountPercent,
    discountAmount,
    lineDiscountTotal,
    finalUnitPrice,
    shippingCharge,
    lineShippingTotal,
  };
}

export function normalizeOrderDiscountTotal(
  order: { discountTotal?: number },
  items: OrderItemLike[]
): number {
  if (order.discountTotal !== undefined) {
    return order.discountTotal;
  }
  return items.reduce(
    (sum, item) =>
      sum +
      (item.lineDiscountTotal ?? (item.discountAmount ?? 0) * item.quantity),
    0
  );
}
