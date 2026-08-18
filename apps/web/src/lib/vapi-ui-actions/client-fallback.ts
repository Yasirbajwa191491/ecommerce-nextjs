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

function deliveryMethodFromParameters(
  parameters: Record<string, unknown>
): string | undefined {
  if (
    typeof parameters.deliveryMethod === "string" &&
    parameters.deliveryMethod.trim()
  ) {
    return parameters.deliveryMethod.trim();
  }
  return undefined;
}

function resolveDeliveryMethod(
  parameters: Record<string, unknown>,
  payload: Record<string, unknown>
): string | undefined {
  if (
    typeof parameters.deliveryMethod === "string" &&
    parameters.deliveryMethod.trim()
  ) {
    return parameters.deliveryMethod.trim();
  }
  if (
    typeof payload.selectedDeliveryMethod === "string" &&
    payload.selectedDeliveryMethod.trim()
  ) {
    return payload.selectedDeliveryMethod.trim();
  }
  if (
    typeof payload.deliveryMethod === "string" &&
    payload.deliveryMethod.trim()
  ) {
    return payload.deliveryMethod.trim();
  }
  return undefined;
}

function resolveCustomerEmail(
  parameters: Record<string, unknown>
): string | undefined {
  const customer = parameters.customer;
  if (typeof customer !== "object" || customer === null) return undefined;
  const email = (customer as Record<string, unknown>).email;
  return typeof email === "string" && email.trim() ? email.trim() : undefined;
}

function buildGetCartActions(
  parameters: Record<string, unknown>,
  _payload: Record<string, unknown>
): UiAction[] {
  const deliveryMethod = deliveryMethodFromParameters(parameters);
  if (deliveryMethod) {
    return [
      { type: "openCheckout", phase: "payment" },
      { type: "setCheckoutProgress", phase: "payment" },
      { type: "prefillCheckoutDelivery", method: deliveryMethod },
      { type: "scrollToTarget", target: "checkoutSummary" },
    ];
  }
  return [
    { type: "openCart" },
    { type: "setCheckoutProgress", phase: "cart_review" },
  ];
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
      return buildGetCartActions(parameters, payload);
    case "getDeliveryOptions": {
      const deliveryMethod = resolveDeliveryMethod(parameters, payload);
      return [
        { type: "openCheckout", phase: "delivery" },
        { type: "setCheckoutProgress", phase: "delivery" },
        ...(deliveryMethod
          ? [{ type: "prefillCheckoutDelivery" as const, method: deliveryMethod }]
          : []),
        { type: "scrollToTarget", target: "checkoutDelivery" },
      ];
    }
    case "removeFromCart":
      return [{ type: "openCart" }];
    case "createCheckoutSession": {
      const checkoutUrl =
        typeof payload.checkoutUrl === "string"
          ? payload.checkoutUrl
          : typeof payload.url === "string"
            ? payload.url
            : undefined;
      return [
        { type: "setCheckoutProgress", phase: "ready" },
        ...(checkoutUrl
          ? [{ type: "openStripeCheckout" as const, url: checkoutUrl }]
          : [
              { type: "openCheckout" as const, phase: "ready" as const },
              { type: "scrollToTarget" as const, target: "checkoutSummary" as const },
            ]),
      ];
    }
    case "createCashOrder":
      return [
        { type: "setCheckoutProgress", phase: "ready" },
        ...(typeof payload.orderNumber === "string"
          ? [
              {
                type: "openOrderConfirmed" as const,
                orderNumber: payload.orderNumber,
                email: resolveCustomerEmail(parameters),
              },
            ]
          : []),
      ];
    case "trackOrder": {
      const orderNumber = String(parameters.orderNumber ?? "").trim();
      const requestId = Date.now();
      if (payload.found === true) {
        const order =
          typeof payload.order === "object" && payload.order !== null
            ? (payload.order as Record<string, unknown>)
            : null;
        const resolvedOrderNumber = String(
          order?.orderNumber ?? orderNumber
        ).trim();
        return [
          { type: "openTrackOrder" },
          {
            type: "prefillTrackOrder",
            orderNumber: resolvedOrderNumber,
            activeTab: "order-number",
            autoSubmit: true,
            requestId,
          },
        ];
      }
      return [
        { type: "openTrackOrder" },
        {
          type: "prefillTrackOrder",
          orderNumber,
          activeTab: "order-number",
          autoSubmit: Boolean(orderNumber),
          requestId,
        },
      ];
    }
    case "getOrdersByEmail":
    case "getOrdersByCustomer": {
      const email = String(parameters.email ?? "").trim();
      const phone = String(parameters.phone ?? "").trim();
      return [
        { type: "openTrackOrder", email: email || undefined, phone: phone || undefined },
        {
          type: "prefillTrackOrder",
          email: email || undefined,
          phone: phone || undefined,
          activeTab: "customer",
          autoSubmit: Boolean(email || phone),
          requestId: Date.now(),
        },
      ];
    }
    case "createReview": {
      const productId = String(
        parameters.productId ?? payload.productId ?? ""
      ).trim();
      if (!productId) {
        return [{ type: "scrollToTarget", target: "reviews" }];
      }
      return [
        { type: "openProductDetails", productId, scrollTo: "reviews" },
        { type: "scrollToTarget", target: "reviews", productId },
      ];
    }
    case "getShippingPolicy":
      return [{ type: "navigateToShopPage", path: "/shipping" }];
    case "getReturnPolicy":
      return [{ type: "navigateToShopPage", path: "/return" }];
    case "getStoreInfo":
      return [{ type: "navigateToShopPage", path: "/contact" }];
    case "getShoppingGuide": {
      const topic =
        typeof parameters.topic === "string"
          ? parameters.topic.trim().toLowerCase()
          : "";
      if (topic.includes("track") || topic.includes("order")) {
        return [{ type: "navigateToShopPage", path: "/track-order" }];
      }
      if (topic.includes("contact") || topic.includes("support")) {
        return [{ type: "navigateToShopPage", path: "/contact" }];
      }
      if (topic.includes("about")) {
        return [{ type: "navigateToShopPage", path: "/about" }];
      }
      if (topic.includes("ship")) {
        return [{ type: "navigateToShopPage", path: "/shipping" }];
      }
      if (topic.includes("return")) {
        return [{ type: "navigateToShopPage", path: "/return" }];
      }
      return [{ type: "navigateToShopPage", path: "/products" }];
    }
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

  const normalizedResult =
    typeof result === "string"
      ? (() => {
          try {
            return JSON.parse(result) as unknown;
          } catch {
            return result;
          }
        })()
      : result;

  return buildClientUiActions(toolName, parameters, normalizedResult);
}
