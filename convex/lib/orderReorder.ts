import type { Doc, Id } from "../_generated/dataModel";
import { isProductActive } from "./productActive";

export type ReorderUnavailableReason =
  | "product_not_found"
  | "product_inactive"
  | "out_of_stock";

export type ReorderAvailableItem = {
  productId: Id<"products">;
  productName: string;
  color: string;
  requestedQuantity: number;
  quantity: number;
  currentPrice: number;
  currency: string;
  stock: number;
  imageUrl: string;
  colors: string[];
  /** True when this line was a free promotion gift on the original order. */
  wasPromotionGift: boolean;
};

export type ReorderUnavailableItem = {
  productId: string;
  productName: string;
  color: string;
  requestedQuantity: number;
  reason: ReorderUnavailableReason;
  reasonLabel: string;
};

const UNAVAILABLE_LABELS: Record<ReorderUnavailableReason, string> = {
  product_not_found: "Product no longer available",
  product_inactive: "Product is no longer sold",
  out_of_stock: "Out of stock",
};

export function evaluateReorderLine(args: {
  item: Doc<"orderItems">;
  product: Doc<"products"> | null;
}): ReorderAvailableItem | ReorderUnavailableItem {
  const { item, product } = args;

  if (!product) {
    return {
      productId: item.productId as string,
      productName: item.productName,
      color: item.color,
      requestedQuantity: item.quantity,
      reason: "product_not_found",
      reasonLabel: UNAVAILABLE_LABELS.product_not_found,
    };
  }

  if (!isProductActive(product)) {
    return {
      productId: product._id,
      productName: item.productName,
      color: item.color,
      requestedQuantity: item.quantity,
      reason: "product_inactive",
      reasonLabel: UNAVAILABLE_LABELS.product_inactive,
    };
  }

  const stock = Math.max(product.stock ?? 0, 0);
  if (stock <= 0) {
    return {
      productId: product._id,
      productName: item.productName,
      color: item.color,
      requestedQuantity: item.quantity,
      reason: "out_of_stock",
      reasonLabel: UNAVAILABLE_LABELS.out_of_stock,
    };
  }

  const quantity = Math.min(item.quantity, stock);
  const primaryIndex = product.primaryImageIndex ?? 0;
  const imageEntry = product.image[primaryIndex] ?? product.image[0];
  const imageUrl = imageEntry?.url ?? "";

  return {
    productId: product._id,
    productName: product.name,
    color: item.color,
    requestedQuantity: item.quantity,
    quantity,
    currentPrice: product.price,
    currency: product.currency ?? "USD",
    stock,
    imageUrl,
    colors: product.colors ?? [],
    wasPromotionGift: item.isPromotionGift ?? false,
  };
}

export function canReorderOrder(status: Doc<"orders">["status"]): boolean {
  return ["delivered", "cancelled", "refunded", "confirmed", "shipped", "processing"].includes(
    status
  );
}

export function isReorderQuantityAdjusted(item: {
  quantity: number;
  requestedQuantity: number;
}): boolean {
  return item.quantity < item.requestedQuantity;
}

export function shouldPromptReorderNotice(args: {
  unavailableCount: number;
  available: Array<{ quantity: number; requestedQuantity: number }>;
}): boolean {
  return (
    args.unavailableCount > 0 ||
    args.available.some(isReorderQuantityAdjusted)
  );
}
