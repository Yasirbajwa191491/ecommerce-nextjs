import type { Doc, Id } from "../_generated/dataModel";
import type { ProductWithCategory } from "../lib/products";
import { calculateFinalPrice } from "../lib/pricing";
import { getSiteUrl } from "../lib/siteUrl";
import type { PublicOrderDetail, PublicOrderSummary } from "../lib/publicOrderDto";

export type VapiProductSummary = {
  id: string;
  name: string;
  price: number;
  finalPrice: number;
  discountPercent: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  category: string | null;
  url: string;
  inStock: boolean;
};

export type VapiProductDetail = VapiProductSummary & {
  description: string;
  company: string;
  shippingInfo: string;
  stock: number;
};

function buildProductUrl(productId: Id<"products">): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/product/${productId}`;
}

function shippingInfo(product: Doc<"products">): string {
  if (product.shipping) {
    return "Free shipping on this product.";
  }
  const charge = product.shippingCharges ?? 0;
  return charge > 0
    ? `Shipping charge: ${product.currency ?? "USD"} ${charge.toFixed(2)}`
    : "Shipping charges may apply at checkout.";
}

export function toVapiProductSummary(
  product: ProductWithCategory
): VapiProductSummary {
  const discountPercent = product.discountPercent ?? 0;
  const finalPrice = calculateFinalPrice(product.price, discountPercent);
  return {
    id: product._id,
    name: product.name,
    price: product.price,
    finalPrice,
    discountPercent,
    currency: product.currency ?? "USD",
    rating: product.stars,
    reviewsCount: product.reviews,
    category: product.category?.name ?? null,
    url: buildProductUrl(product._id),
    inStock: product.stock > 0,
  };
}

export function toVapiProductDetail(
  product: ProductWithCategory
): VapiProductDetail {
  return {
    ...toVapiProductSummary(product),
    description: product.description,
    company: product.company,
    shippingInfo: shippingInfo(product),
    stock: product.stock,
  };
}

export function toVapiOrderSummary(order: PublicOrderSummary) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export function toVapiOrderDetail(order: PublicOrderDetail) {
  const latestUpdate =
    order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1]
      : null;
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    shipmentStatus: order.status,
    total: order.total,
    currency: order.currency,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
    latestUpdate: latestUpdate
      ? {
          event: latestUpdate.event,
          description: latestUpdate.description,
          createdAt: latestUpdate.createdAt,
        }
      : null,
    statusHistory: order.statusHistory.map((entry) => ({
      event: entry.event,
      description: entry.description,
      createdAt: entry.createdAt,
    })),
  };
}
