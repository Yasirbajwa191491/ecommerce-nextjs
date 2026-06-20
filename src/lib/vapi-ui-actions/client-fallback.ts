/**
 * Client-side fallback when tool results lack uiActions (e.g. cached responses).
 * Mirrors convex/vapi/lib/uiActions.ts mapping.
 */

import type { CatalogFilterPayload, UiAction } from "./types";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function extractProductIds(result: Record<string, unknown>): string[] {
  const products = result.products;
  if (!Array.isArray(products)) return [];
  return products
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const record = item as Record<string, unknown>;
      const id = record.id ?? record.productId;
      return typeof id === "string" ? id : null;
    })
    .filter((id): id is string => Boolean(id));
}

function buildSearchFilters(
  parameters: Record<string, unknown>,
  result: Record<string, unknown>
): CatalogFilterPayload {
  const filters: CatalogFilterPayload = {};
  const query =
    typeof parameters.query === "string" ? parameters.query.trim() : "";
  if (query) filters.search = query;

  const category =
    typeof parameters.categoryName === "string"
      ? parameters.categoryName
      : typeof parameters.category === "string"
        ? parameters.category
        : undefined;
  if (category?.trim()) filters.categorySlug = slugify(category);

  const maxPrice =
    typeof parameters.maxPrice === "number"
      ? parameters.maxPrice
      : typeof parameters.maxBudget === "number"
        ? parameters.maxBudget
        : typeof parameters.budget === "number"
          ? parameters.budget
          : undefined;
  if (maxPrice !== undefined) filters.maxPrice = maxPrice;

  const firstProduct = Array.isArray(result.products)
    ? (result.products[0] as Record<string, unknown> | undefined)
    : undefined;
  if (
    !filters.categorySlug &&
    firstProduct &&
    typeof firstProduct.category === "string"
  ) {
    filters.categorySlug = slugify(firstProduct.category);
  }

  return filters;
}

export function buildClientUiActions(
  toolName: string,
  parameters: Record<string, unknown>,
  result: unknown
): UiAction[] {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return [];
  }
  const payload = result as Record<string, unknown>;
  if (typeof payload.error === "string") {
    return [{ type: "setAiSearchLoading", loading: false }];
  }

  switch (toolName) {
    case "searchProducts":
    case "searchProductsHybrid":
    case "buildProductBundle": {
      const filters = buildSearchFilters(parameters, payload);
      const productIds = extractProductIds(payload);
      return [
        { type: "setAiSearchLoading", loading: true },
        { type: "navigateToProducts", filters },
        { type: "applySearchFilters", filters },
        { type: "setAiSearchLoading", loading: false },
        ...(productIds.length
          ? [
              { type: "highlightProducts" as const, productIds: productIds.slice(0, 8) },
              { type: "scrollToTarget" as const, target: "productGrid" as const },
            ]
          : []),
      ];
    }
    case "recommendProducts":
    case "getBestSellers": {
      const filters = buildSearchFilters(parameters, payload);
      const productIds = extractProductIds(payload);
      return [
        { type: "navigateToProducts", filters },
        { type: "applySearchFilters", filters },
        ...(productIds.length
          ? [
              { type: "highlightProducts" as const, productIds: productIds.slice(0, 8) },
              { type: "scrollToTarget" as const, target: "productGrid" as const },
            ]
          : []),
      ];
    }
    case "getProductDetails": {
      const productId = String(
        payload.id ?? parameters.productId ?? parameters.id ?? ""
      );
      if (!productId) return [];
      return [{ type: "openProductDetails", productId }];
    }
    case "getProductReviews": {
      const productId = String(
        payload.productId ?? parameters.productId ?? parameters.id ?? ""
      );
      if (!productId) return [{ type: "scrollToTarget", target: "reviews" }];
      return [
        { type: "openProductDetails", productId, scrollTo: "reviews" },
        { type: "scrollToTarget", target: "reviews", productId },
      ];
    }
    case "addToCart":
    case "addMultipleToCart":
      return [
        { type: "openCart" },
        { type: "setCheckoutProgress", phase: "cart_review" },
      ];
    case "getCart":
      return [{ type: "setCheckoutProgress", phase: "cart_review" }];
    case "getDeliveryOptions":
      return [{ type: "setCheckoutProgress", phase: "delivery" }];
    case "removeFromCart":
      return [{ type: "openCart" }];
    case "createCheckoutSession":
      return [
        { type: "openCheckout", phase: "ready" },
        { type: "setCheckoutProgress", phase: "ready" },
        { type: "scrollToTarget", target: "checkoutSummary" },
      ];
    case "createCashOrder":
      return [
        { type: "setCheckoutProgress", phase: "ready" },
        ...(typeof payload.orderNumber === "string"
          ? [{ type: "openTrackOrder" as const, orderNumber: payload.orderNumber }]
          : []),
      ];
    case "trackOrder": {
      const orderNumber = String(parameters.orderNumber ?? "");
      if (payload.found === true) {
        const order =
          typeof payload.order === "object" && payload.order !== null
            ? (payload.order as Record<string, unknown>)
            : null;
        const num = String(order?.orderNumber ?? orderNumber);
        return [
          { type: "openTrackOrder", orderNumber: num },
          { type: "prefillTrackOrder", orderNumber: num },
        ];
      }
      return [
        { type: "prefillTrackOrder", orderNumber },
        { type: "openTrackOrder", orderNumber },
      ];
    }
    case "getOrdersByEmail":
      return [
        { type: "prefillTrackOrder", email: String(parameters.email ?? "") },
        { type: "openTrackOrder", email: String(parameters.email ?? "") },
      ];
    default:
      return [];
  }
}

export function resolveUiActions(
  toolName: string,
  parameters: Record<string, unknown>,
  result: unknown
): UiAction[] {
  const fromResult = (() => {
    if (typeof result === "string") {
      try {
        const parsed: unknown = JSON.parse(result);
        if (typeof parsed === "object" && parsed !== null) {
          const actions = (parsed as Record<string, unknown>).uiActions;
          if (Array.isArray(actions)) {
            return actions.filter(
              (a): a is UiAction =>
                typeof a === "object" && a !== null && "type" in a
            );
          }
        }
      } catch {
        return [];
      }
    }
    if (typeof result === "object" && result !== null) {
      const actions = (result as Record<string, unknown>).uiActions;
      if (Array.isArray(actions)) {
        return actions.filter(
          (a): a is UiAction =>
            typeof a === "object" && a !== null && "type" in a
        );
      }
    }
    return [];
  })();

  if (fromResult.length) return fromResult;
  return buildClientUiActions(toolName, parameters, result);
}
