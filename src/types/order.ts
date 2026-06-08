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

export type Order = {
  _id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerNotes?: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountTotal?: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeTransactionId?: string;
  paidAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type OrderItem = {
  _id: string;
  orderId: string;
  productId: string;
  productName: string;
  color: string;
  sku?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  originalUnitPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  lineDiscountTotal?: number;
  finalUnitPrice?: number;
  shippingCharge?: number;
  lineShippingTotal?: number;
};

export type PublicOrderItem = {
  productId: string;
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

export type TransactionLog = {
  id: string;
  logType: "order_status" | "payment";
  event: string;
  description: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  previousPaymentStatus?: PaymentStatus;
  newPaymentStatus?: PaymentStatus;
  actorType: string;
  actorName?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeTransactionId?: string;
  amount?: number;
  currency?: string;
  createdAt: number;
};
