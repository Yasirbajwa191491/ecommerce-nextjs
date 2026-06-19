import type { Doc, Id } from "../_generated/dataModel";
import type { ProductWithCategory } from "../lib/products";
import { calculateFinalPrice, roundMoney } from "../lib/pricing";
import { getSiteUrl } from "../lib/siteUrl";
import { HOW_TO_BUY_STEPS } from "../lib/storeGuideContent";
import type { PublicOrderDetail, PublicOrderSummary } from "../lib/publicOrderDto";
import {
  DELIVERY_METHOD_LABELS,
  formatWarrantySummary,
  normalizeDeliveryOptions,
  type DeliveryMethodType,
  type DeliveryOption,
} from "../lib/productValidators";

export type VapiDeliveryOption = {
  type: DeliveryMethodType;
  label: string;
  charge: number;
  estimate: string;
};

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
  stock?: number;
  colors?: string[];
};

export type VapiProductDetail = VapiProductSummary & {
  description: string;
  company: string;
  shippingInfo: string;
  stock: number;
  colors: string[];
  sku: string | null;
  featured: boolean;
  highlightPoints: string[];
  reviewSummary: string | null;
  howToBuy: string[];
  addToCartUrl: string;
  warrantyAvailable: boolean;
  warrantySummary: string | null;
  deliveryOptions: VapiDeliveryOption[];
};

function buildProductUrl(productId: Id<"products">): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}/product/${productId}`;
}

function formatProductDeliveryOptions(
  product: Doc<"products">
): VapiDeliveryOption[] {
  const options: DeliveryOption[] = normalizeDeliveryOptions(
    product.deliveryOptions
  );
  return options
    .filter((option) => option.enabled)
    .map((option) => ({
      type: option.type,
      label: DELIVERY_METHOD_LABELS[option.type],
      charge:
        option.type === "standard"
          ? product.shipping
            ? 0
            : roundMoney(product.shippingCharges ?? 0)
          : roundMoney(option.charge),
      estimate: option.estimate,
    }));
}

function formatProductWarranty(product: Doc<"products">): {
  warrantyAvailable: boolean;
  warrantySummary: string | null;
} {
  const warrantyAvailable = product.warrantyAvailable === true;
  const warrantySummary = warrantyAvailable
    ? (formatWarrantySummary(product) ?? null)
    : null;
  return { warrantyAvailable, warrantySummary };
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
  product: ProductWithCategory,
  options?: { includeStock?: boolean }
): VapiProductSummary {
  const discountPercent = product.discountPercent ?? 0;
  const finalPrice = calculateFinalPrice(product.price, discountPercent);
  const summary: VapiProductSummary = {
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

  if (options?.includeStock) {
    summary.stock = product.stock;
    summary.colors = product.colors;
  }

  return summary;
}

export function toVapiProductDetail(
  product: ProductWithCategory,
  extras?: {
    highlightPoints?: string[];
    reviewSummary?: string | null;
  }
): VapiProductDetail {
  const summary = toVapiProductSummary(product, { includeStock: true });
  const warranty = formatProductWarranty(product);
  return {
    ...summary,
    stock: product.stock,
    colors: product.colors,
    description: product.description,
    company: product.company,
    shippingInfo: shippingInfo(product),
    sku: product.sku ?? null,
    featured: product.featured,
    highlightPoints: extras?.highlightPoints ?? [],
    reviewSummary: extras?.reviewSummary ?? null,
    howToBuy: [...HOW_TO_BUY_STEPS],
    addToCartUrl: summary.url,
    warrantyAvailable: warranty.warrantyAvailable,
    warrantySummary: warranty.warrantySummary,
    deliveryOptions: formatProductDeliveryOptions(product),
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
    shipping: order.shipping,
    deliveryCharge: order.deliveryCharge ?? 0,
    deliveryMethod: order.deliveryMethod ?? null,
    deliveryMethodLabel: order.deliveryMethodLabel ?? null,
    deliveryEstimate: order.deliveryEstimate ?? null,
    items: order.items.map((item) => ({
      name: item.productName,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      isPromotionGift: item.isPromotionGift ?? false,
      warrantySummary: item.warrantySummary ?? null,
    })),
    promotions: order.promotions.map((promo) => ({
      name: promo.promotionName,
      description: promo.promotionDescription ?? null,
      freeQuantity: promo.freeQuantity,
      savingsAmount: promo.savingsAmount,
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
    trackingUrl: `${getSiteUrl().replace(/\/$/, "")}/track-order`,
  };
}
