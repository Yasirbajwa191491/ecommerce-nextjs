import type { Doc } from "../_generated/dataModel";

export type NormalizedOrderItem = {
  productName: string;
  color: string;
  sku?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  shippingCharge: number;
  lineShippingTotal: number;
};

export function normalizeOrderItem(item: Doc<"orderItems">): NormalizedOrderItem {
  const unitPrice = item.unitPrice;
  const originalUnitPrice = item.originalUnitPrice ?? unitPrice;
  const discountPercent = item.discountPercent ?? 0;
  const discountAmount = item.discountAmount ?? 0;
  const finalUnitPrice = item.finalUnitPrice ?? unitPrice;
  const lineDiscountTotal =
    item.lineDiscountTotal ?? discountAmount * item.quantity;
  const shippingCharge = item.shippingCharge ?? 0;
  const lineShippingTotal = item.lineShippingTotal ?? shippingCharge;

  return {
    productName: item.productName,
    color: item.color,
    sku: item.sku,
    size: item.size,
    quantity: item.quantity,
    unitPrice: finalUnitPrice,
    lineTotal: item.lineTotal,
    imageUrl: item.imageUrl,
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
  order: Doc<"orders">,
  items: Doc<"orderItems">[]
): number {
  if (order.discountTotal !== undefined) {
    return order.discountTotal;
  }
  return items.reduce(
    (sum, item) =>
      sum + (item.lineDiscountTotal ?? (item.discountAmount ?? 0) * item.quantity),
    0
  );
}
