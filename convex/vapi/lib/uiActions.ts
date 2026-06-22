/**
 * UI actions emitted alongside Vapi tool results for storefront navigation.
 * Mirrored on the frontend in src/lib/vapi-ui-actions/types.ts
 */

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

export type CatalogFilterPayload = {
  search?: string;
  categorySlug?: string;
  brandSlugs?: string[];
  colorSlugs?: string[];
  promotionSlugs?: string[];
  minRating?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
};

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
  | { type: "openStripeCheckout"; url: string }
  | { type: "navigateToShopPage"; path: string }
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
      const id = record.id ?? record.productId ?? record._id;
      return typeof id === "string" ? id : null;
    })
    .filter((id): id is string => Boolean(id));
}

function toCompareSummaries(products: unknown[]): CompareProductSummary[] {
  const summaries: CompareProductSummary[] = [];
  for (const item of products) {
    if (typeof item !== "object" || item === null) continue;
    const p = item as Record<string, unknown>;
    const id = String(p.id ?? p.productId ?? "");
    if (!id) continue;
    summaries.push({
      id,
      name: String(p.name ?? p.title ?? "Product"),
      finalPrice: Number(p.finalPrice ?? p.price ?? 0),
      currency: String(p.currency ?? "USD"),
      rating: Number(p.rating ?? p.stars ?? 0),
      reviewsCount: Number(p.reviewsCount ?? p.reviews ?? 0),
      inStock: p.inStock !== false,
      url: typeof p.url === "string" ? p.url : undefined,
    });
  }
  return summaries;
}

function buildSearchFilters(
  parameters: Record<string, unknown>,
  result: Record<string, unknown>
): CatalogFilterPayload {
  const filters: CatalogFilterPayload = {};

  const query =
    typeof parameters.query === "string"
      ? parameters.query.trim()
      : typeof parameters.preference === "string"
        ? parameters.preference.trim()
        : "";
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

  const color =
    typeof parameters.color === "string" ? parameters.color : undefined;
  if (color?.trim()) filters.colorSlugs = [slugify(color)];

  const brand =
    typeof parameters.brand === "string" ? parameters.brand : undefined;
  if (brand?.trim()) filters.brandSlugs = [slugify(brand)];

  const firstProduct = Array.isArray(result.products)
    ? (result.products[0] as Record<string, unknown> | undefined)
    : undefined;
  if (
    !filters.categorySlug &&
    firstProduct &&
    typeof firstProduct.category === "string" &&
    firstProduct.category.trim()
  ) {
    filters.categorySlug = slugify(firstProduct.category);
  }

  return filters;
}

function searchActions(
  toolName: string,
  parameters: Record<string, unknown>,
  result: Record<string, unknown>
): UiAction[] {
  const filters = buildSearchFilters(parameters, result);
  const productIds = extractProductIds(result);
  const actions: UiAction[] = [
    { type: "setAiSearchLoading", loading: true },
    { type: "navigateToProducts", filters },
    { type: "applySearchFilters", filters },
    { type: "setAiSearchLoading", loading: false },
  ];

  if (
    filters.search ||
    filters.categorySlug ||
    filters.maxPrice !== undefined ||
    filters.brandSlugs?.length
  ) {
    actions.push({
      type: "setGuidedShopping",
      active: true,
      preferences: {
        ...filters,
        budget: filters.maxPrice,
      },
    });
  }
  if (productIds.length) {
    actions.push({ type: "highlightProducts", productIds: productIds.slice(0, 8) });
    actions.push({ type: "scrollToTarget", target: "productGrid" });
  }
  if (toolName === "buildProductBundle" && productIds.length >= 2) {
    const bundleItems = Array.isArray(result.bundle) ? result.bundle : [];
    const compareSource =
      bundleItems.length > 0 ? bundleItems : (result.products ?? []);
    actions.push({
      type: "compareProducts",
      productIds: productIds.slice(0, 4),
      products: toCompareSummaries(compareSource as unknown[]),
    });
  }
  return actions;
}

function resolveCustomerEmail(
  parameters: Record<string, unknown>
): string | undefined {
  const customer = parameters.customer;
  if (typeof customer !== "object" || customer === null) return undefined;
  const email = (customer as Record<string, unknown>).email;
  return typeof email === "string" && email.trim() ? email.trim() : undefined;
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

export function buildUiActions(
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
      return searchActions(toolName, parameters, payload);

    case "recommendProducts":
    case "getBestSellers": {
      const productIds = extractProductIds(payload);
      const filters = buildSearchFilters(parameters, payload);
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

    case "buildProductBundle":
      return searchActions(toolName, parameters, payload);

    case "getProductDetails": {
      const productId = String(
        payload.id ?? parameters.productId ?? parameters.id ?? ""
      );
      if (!productId) return [];
      const scrollTo =
        parameters.scrollTo === "reviews" ||
        parameters.scrollTo === "specifications" ||
        parameters.scrollTo === "highlights"
          ? (parameters.scrollTo as ScrollTarget)
          : undefined;
      return [
        { type: "openProductDetails", productId, scrollTo },
        ...(scrollTo ? [{ type: "scrollToTarget" as const, target: scrollTo, productId }] : []),
      ];
    }

    case "getProductReviews": {
      const productId = String(
        payload.productId ?? parameters.productId ?? parameters.id ?? ""
      );
      if (!productId) {
        return [{ type: "scrollToTarget", target: "reviews" }];
      }
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
        ...(typeof payload.productId === "string"
          ? [{ type: "highlightProducts" as const, productIds: [String(payload.productId)] }]
          : []),
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
      if (payload.found !== true) {
        return [
          {
            type: "prefillTrackOrder",
            orderNumber: String(parameters.orderNumber ?? ""),
          },
          { type: "openTrackOrder", orderNumber: String(parameters.orderNumber ?? "") },
        ];
      }
      const order =
        typeof payload.order === "object" && payload.order !== null
          ? (payload.order as Record<string, unknown>)
          : null;
      const orderNumber = String(order?.orderNumber ?? parameters.orderNumber ?? "");
      return [
        { type: "openTrackOrder", orderNumber },
        { type: "prefillTrackOrder", orderNumber },
        { type: "setCheckoutProgress", phase: "understanding" },
      ];
    }

    case "getOrdersByEmail":
      return [
        {
          type: "prefillTrackOrder",
          email: String(parameters.email ?? ""),
        },
        { type: "openTrackOrder", email: String(parameters.email ?? "") },
      ];

    case "createReview": {
      const productId = String(
        parameters.productId ?? payload.productId ?? ""
      ).trim();
      if (!productId) {
        return [{ type: "scrollToTarget", target: "reviews" }];
      }
      return payload.success === true
        ? [
            { type: "openProductDetails", productId, scrollTo: "reviews" },
            { type: "scrollToTarget", target: "reviews", productId },
          ]
        : [
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

export function enrichToolResult(
  toolName: string,
  parameters: Record<string, unknown>,
  result: unknown
): unknown {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }

  const record = result as Record<string, unknown>;
  if (Array.isArray(record.uiActions)) {
    return result;
  }

  const uiActions = buildUiActions(toolName, parameters, result);
  if (!uiActions.length) {
    return result;
  }

  return { ...record, uiActions };
}
