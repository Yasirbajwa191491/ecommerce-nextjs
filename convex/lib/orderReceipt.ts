import type { Doc } from "../_generated/dataModel";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";
import { normalizeOrderDiscountTotal } from "./orderItemSnapshot";
import { formatPaymentMethodLabel, formatOrderStatusLabel, formatPaymentStatusLabel } from "./orderValidators";

export type ReceiptKind = "final" | "provisional" | "record";

export type OrderReceiptItem = {
  productName: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isPromotionGift: boolean;
};

export type OrderReceiptDto = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  orderNumber: string;
  orderDate: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  orderStatusLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: OrderReceiptItem[];
  subtotal: number;
  discountTotal: number;
  shipping: number;
  deliveryCharge?: number;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  tax: number;
  total: number;
  currency: string;
  paidAt?: number;
  receiptKind: ReceiptKind;
  receiptTitle: string;
  receiptNote?: string;
  promotions: Array<{
    promotionName: string;
    promotionDescription?: string;
    freeQuantity: number;
    savingsAmount: number;
  }>;
};

export function resolveReceiptEligibility(order: {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
}): { available: boolean; kind: ReceiptKind; title: string; note?: string } {
  const isPendingStripe =
    order.paymentMethod === "stripe" &&
    order.paymentStatus === "pending" &&
    order.status === "pending";

  if (isPendingStripe) {
    return {
      available: true,
      kind: "provisional",
      title: "Order Summary",
      note: "Payment is still being confirmed. This is not a final receipt.",
    };
  }

  if (order.status === "cancelled") {
    return {
      available: true,
      kind: "record",
      title: "Cancelled Order Record",
      note: "This order was cancelled.",
    };
  }

  if (order.status === "refunded" || order.paymentStatus === "refunded") {
    return {
      available: true,
      kind: "record",
      title: "Refunded Order Receipt",
      note: "This order has been refunded.",
    };
  }

  if (order.status === "expired" || order.status === "failed") {
    return {
      available: true,
      kind: "record",
      title: "Order Record",
      note: `This order is ${formatOrderStatusLabel(order.status).toLowerCase()}.`,
    };
  }

  return {
    available: true,
    kind: "final",
    title: "Order Receipt",
  };
}

export function buildOrderReceiptDto(args: {
  order: Doc<"orders">;
  items: Doc<"orderItems">[];
  promotions: Array<{
    promotionName: string;
    promotionDescription?: string;
    freeQuantity: number;
    savingsAmount: number;
  }>;
  branding: {
    storeName: string;
    email: string;
    phone: string;
    address: string;
  };
}): OrderReceiptDto {
  const { order, items, promotions, branding } = args;
  const eligibility = resolveReceiptEligibility(order);

  return {
    storeName: branding.storeName,
    storeEmail: branding.email,
    storePhone: branding.phone,
    storeAddress: branding.address,
    orderNumber: order.orderNumber,
    orderDate: order.createdAt,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    paymentMethodLabel: formatPaymentMethodLabel(order.paymentMethod),
    paymentStatusLabel: formatPaymentStatusLabel(order.paymentStatus),
    orderStatusLabel: formatOrderStatusLabel(order.status),
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    items: items.map((item) => ({
      productName: item.productName,
      color: item.color,
      quantity: item.quantity,
      unitPrice: item.finalUnitPrice ?? item.unitPrice,
      lineTotal: item.lineTotal,
      isPromotionGift: item.isPromotionGift ?? false,
    })),
    subtotal: order.subtotal,
    discountTotal: normalizeOrderDiscountTotal(order, items),
    shipping: order.shipping,
    deliveryCharge: order.deliveryCharge,
    deliveryMethodLabel: order.deliveryMethodLabel,
    deliveryEstimate: order.deliveryEstimate,
    tax: order.tax,
    total: order.total,
    currency: order.currency,
    paidAt: order.paidAt,
    receiptKind: eligibility.kind,
    receiptTitle: eligibility.title,
    receiptNote: eligibility.note,
    promotions,
  };
}
