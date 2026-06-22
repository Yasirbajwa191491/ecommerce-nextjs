import type { CatalogFilterState } from "@/lib/shop/catalog-filter-url";

export type ScrollTarget =
  | "productGrid"
  | "reviews"
  | "specifications"
  | "highlights"
  | "checkoutSummary"
  | "checkoutDelivery";

export type CheckoutProgressPhase =
  | "understanding"
  | "cart_review"
  | "delivery"
  | "payment"
  | "ready";

export type CatalogFilterPayload = Partial<
  Pick<
    CatalogFilterState,
    | "search"
    | "categorySlug"
    | "brandSlugs"
    | "colorSlugs"
    | "promotionSlugs"
    | "minRating"
    | "minPrice"
    | "maxPrice"
    | "sort"
  >
>;

export type GuidedShoppingPreferences = CatalogFilterPayload & {
  budget?: number;
  deliveryPreference?: string;
};

export type CompareProductSummary = {
  id: string;
  name: string;
  finalPrice: number;
  currency: string;
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  url?: string;
};

export type UiAction =
  | { type: "navigateToProducts"; filters?: CatalogFilterPayload }
  | { type: "applySearchFilters"; filters: CatalogFilterPayload }
  | { type: "openProductDetails"; productId: string; scrollTo?: ScrollTarget }
  | { type: "highlightProducts"; productIds: string[] }
  | {
      type: "compareProducts";
      productIds: string[];
      products?: CompareProductSummary[];
    }
  | { type: "scrollToTarget"; target: ScrollTarget; productId?: string }
  | { type: "openCart" }
  | { type: "openCheckout"; phase?: CheckoutProgressPhase }
  | { type: "openOrderConfirmed"; orderNumber?: string; email?: string }
  | { type: "openTrackOrder"; orderNumber?: string; email?: string }
  | { type: "prefillTrackOrder"; orderNumber?: string; email?: string }
  | { type: "setAiSearchLoading"; loading: boolean }
  | { type: "setCheckoutProgress"; phase: CheckoutProgressPhase }
  | { type: "prefillCheckoutDelivery"; method: string }
  | {
      type: "setGuidedShopping";
      active: boolean;
      preferences?: GuidedShoppingPreferences;
    };

export type VapiActivityPhase =
  | "understanding"
  | "searching"
  | "comparing"
  | "opening_product"
  | "adding_to_cart"
  | "calculating_delivery"
  | "preparing_checkout"
  | "tracking_order";

const UI_ACTION_TYPES = new Set([
  "navigateToProducts",
  "applySearchFilters",
  "openProductDetails",
  "highlightProducts",
  "compareProducts",
  "scrollToTarget",
  "openCart",
  "openCheckout",
  "openOrderConfirmed",
  "openTrackOrder",
  "prefillTrackOrder",
  "setAiSearchLoading",
  "setCheckoutProgress",
  "prefillCheckoutDelivery",
  "setGuidedShopping",
]);

export function isUiAction(value: unknown): value is UiAction {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return false;
  }
  const type = (value as { type: unknown }).type;
  return typeof type === "string" && UI_ACTION_TYPES.has(type);
}

export function extractUiActions(result: unknown): UiAction[] {
  if (typeof result === "string") {
    try {
      const parsed: unknown = JSON.parse(result);
      return extractUiActions(parsed);
    } catch {
      return [];
    }
  }
  if (typeof result !== "object" || result === null) return [];
  const record = result as Record<string, unknown>;
  if (!Array.isArray(record.uiActions)) return [];
  return record.uiActions.filter(isUiAction);
}

export const SCROLL_TARGET_IDS: Record<ScrollTarget, string> = {
  productGrid: "catalog-product-grid",
  reviews: "product-reviews",
  specifications: "product-specifications",
  highlights: "product-highlights",
  checkoutSummary: "checkout-order-summary",
  checkoutDelivery: "checkout-delivery-methods",
};
