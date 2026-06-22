"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  catalogFiltersToPath,
  parseCatalogFilters,
  type CatalogFilterState,
} from "@/lib/shop/catalog-filter-url";
import type { ProductSort } from "@/lib/shop/product-sort";
import { productPath } from "@/lib/product-url";
import { resolveUiActions } from "@/lib/vapi-ui-actions/client-fallback";
import {
  SCROLL_TARGET_IDS,
  type CatalogFilterPayload,
  type UiAction,
} from "@/lib/vapi-ui-actions/types";
import { useVapiStorefrontController } from "@/providers/vapi-storefront-controller";
import type { VapiToolEvent } from "@/lib/vapi-activity";

const NAV_ACTIONS = new Set([
  "navigateToProducts",
  "applySearchFilters",
  "openProductDetails",
  "openCart",
  "openCheckout",
  "openOrderConfirmed",
  "openTrackOrder",
]);

function buildToolDedupeKey(event: VapiToolEvent): string {
  const result =
    typeof event.result === "string"
      ? event.result
      : JSON.stringify(event.result ?? null);
  return `${event.toolName}:${result}`;
}

function mergeCatalogFilters(
  current: CatalogFilterState,
  partial: CatalogFilterPayload
): CatalogFilterState {
  return {
    search: partial.search !== undefined ? partial.search : current.search,
    categorySlug:
      partial.categorySlug !== undefined
        ? partial.categorySlug
        : current.categorySlug,
    brandSlugs: partial.brandSlugs ?? current.brandSlugs,
    colorSlugs: partial.colorSlugs ?? current.colorSlugs,
    promotionSlugs: partial.promotionSlugs ?? current.promotionSlugs,
    minRating: partial.minRating ?? current.minRating,
    minPrice: partial.minPrice ?? current.minPrice,
    maxPrice: partial.maxPrice ?? current.maxPrice,
    sort: (partial.sort as ProductSort | undefined) ?? current.sort,
  };
}

function scrollToElement(targetId: string, retries = 3): void {
  const attempt = (remaining: number) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (remaining > 0) {
      window.setTimeout(() => attempt(remaining - 1), 300);
    }
  };
  requestAnimationFrame(() => attempt(retries));
}

export function useVapiUiActionExecutor() {
  const router = useRouter();
  const pathname = usePathname();
  const controller = useVapiStorefrontController();
  const queueRef = useRef<UiAction[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const processedToolResultsRef = useRef<Set<string>>(new Set());
  const pendingFiltersRef = useRef<CatalogFilterPayload | null>(null);
  const pendingScrollRef = useRef<{ target: keyof typeof SCROLL_TARGET_IDS; productId?: string } | null>(null);

  const executeNavigationAction = useCallback(
    (action: UiAction) => {
      switch (action.type) {
        case "navigateToProducts":
        case "applySearchFilters": {
          const partial = action.filters ?? {};
          pendingFiltersRef.current = {
            ...pendingFiltersRef.current,
            ...partial,
          };
          const currentParams =
            typeof window !== "undefined"
              ? parseCatalogFilters(
                  new URLSearchParams(window.location.search)
                )
              : ({
                  search: "",
                  categorySlug: "",
                  brandSlugs: [],
                  colorSlugs: [],
                  promotionSlugs: [],
                  sort: "default",
                } as CatalogFilterState);
          const merged = mergeCatalogFilters(
            currentParams,
            pendingFiltersRef.current
          );
          const path = catalogFiltersToPath(merged);
          if (pathname !== "/products" || path !== `/products${window.location.search}`) {
            router.push(path);
          }
          break;
        }
        case "openProductDetails": {
          const path = productPath(action.productId);
          if (action.scrollTo) {
            pendingScrollRef.current = {
              target: action.scrollTo,
              productId: action.productId,
            };
          }
          router.push(path);
          break;
        }
        case "openCart":
          router.push("/cart");
          break;
        case "openCheckout":
          router.push("/checkout");
          break;
        case "openOrderConfirmed": {
          if (action.orderNumber?.trim()) {
            sessionStorage.setItem("lastOrderNumber", action.orderNumber.trim());
          }
          if (action.email?.trim()) {
            sessionStorage.setItem("lastOrderEmail", action.email.trim());
          }
          const params = new URLSearchParams();
          if (action.orderNumber?.trim()) {
            params.set("orderNumber", action.orderNumber.trim());
          }
          if (action.email?.trim()) {
            params.set("email", action.email.trim());
          }
          const query = params.toString();
          router.push(query ? `/checkout/success?${query}` : "/checkout/success");
          break;
        }
        case "openTrackOrder": {
          if (action.orderNumber?.trim()) {
            router.push(
              `/track-order/${encodeURIComponent(action.orderNumber.trim())}`
            );
          } else {
            const params = new URLSearchParams();
            if (action.email?.trim()) params.set("email", action.email.trim());
            const q = params.toString();
            router.push(q ? `/track-order?${q}` : "/track-order");
          }
          break;
        }
        default:
          break;
      }
    },
    [pathname, router]
  );

  const executeAction = useCallback(
    (action: UiAction) => {
      if (NAV_ACTIONS.has(action.type)) {
        executeNavigationAction(action);
      }
      controller.applyUiAction(action);

      if (
        action.type === "setCheckoutProgress" &&
        (action.phase === "delivery" ||
          action.phase === "payment" ||
          action.phase === "ready")
      ) {
        executeNavigationAction({ type: "openCheckout", phase: action.phase });
      }

      if (action.type === "scrollToTarget") {
        pendingScrollRef.current = {
          target: action.target,
          productId: action.productId,
        };
      }
    },
    [controller, executeNavigationAction]
  );

  const flushQueue = useCallback(() => {
    const batch = queueRef.current.splice(0);
    flushTimerRef.current = null;
    pendingFiltersRef.current = null;

    if (!batch.length) return;

    controller.setExecutorBusy(true);

    for (const action of batch) {
      executeAction(action);
    }

    window.setTimeout(() => {
      controller.setExecutorBusy(false);
    }, 400);
  }, [controller, executeAction]);

  const enqueueActions = useCallback(
    (actions: UiAction[]) => {
      if (!actions.length) return;
      queueRef.current.push(...actions);
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
      }
      flushTimerRef.current = window.setTimeout(flushQueue, 150);
    },
    [flushQueue]
  );

  const handleToolStart = useCallback(
    (event: VapiToolEvent) => {
      if (
        event.toolName === "searchProducts" ||
        event.toolName === "searchProductsHybrid" ||
        event.toolName === "recommendProducts" ||
        event.toolName === "getBestSellers"
      ) {
        controller.applyUiAction({ type: "setAiSearchLoading", loading: true });
        const filters: CatalogFilterPayload = {};
        const query =
          typeof event.parameters.query === "string"
            ? event.parameters.query.trim()
            : typeof event.parameters.preference === "string"
              ? event.parameters.preference.trim()
              : "";
        if (query) filters.search = query;
        const category =
          typeof event.parameters.categoryName === "string"
            ? event.parameters.categoryName
            : typeof event.parameters.category === "string"
              ? event.parameters.category
              : undefined;
        if (category?.trim()) {
          filters.categorySlug = category.trim().toLowerCase().replace(/\s+/g, "-");
        }
        const maxPrice =
          typeof event.parameters.maxPrice === "number"
            ? event.parameters.maxPrice
            : typeof event.parameters.maxBudget === "number"
              ? event.parameters.maxBudget
              : typeof event.parameters.budget === "number"
                ? event.parameters.budget
                : undefined;
        if (maxPrice !== undefined) filters.maxPrice = maxPrice;

        enqueueActions([
          { type: "navigateToProducts", filters },
          { type: "applySearchFilters", filters },
        ]);
      }

      if (event.toolName === "getProductDetails" || event.toolName === "getProductReviews") {
        const productId = String(
          event.parameters.productId ?? event.parameters.id ?? ""
        ).trim();
        if (productId) {
          enqueueActions([
            {
              type: "openProductDetails",
              productId,
              scrollTo:
                event.toolName === "getProductReviews" ? "reviews" : undefined,
            },
          ]);
        }
      }

      if (event.toolName === "addToCart" || event.toolName === "addMultipleToCart") {
        enqueueActions([
          { type: "openCart" },
          { type: "setCheckoutProgress", phase: "cart_review" },
        ]);
      }

      if (event.toolName === "getCart") {
        const hasDelivery =
          typeof event.parameters.deliveryMethod === "string" &&
          event.parameters.deliveryMethod.trim();
        if (hasDelivery) {
          enqueueActions([
            { type: "openCheckout", phase: "payment" },
            { type: "setCheckoutProgress", phase: "payment" },
            {
              type: "prefillCheckoutDelivery",
              method: String(event.parameters.deliveryMethod).trim(),
            },
          ]);
        } else {
          enqueueActions([
            { type: "openCart" },
            { type: "setCheckoutProgress", phase: "cart_review" },
          ]);
        }
      }

      if (event.toolName === "getDeliveryOptions") {
        enqueueActions([
          { type: "openCheckout", phase: "delivery" },
          { type: "setCheckoutProgress", phase: "delivery" },
        ]);
      }

      if (
        event.toolName === "createCheckoutSession"
      ) {
        enqueueActions([
          { type: "openCheckout", phase: "ready" },
          { type: "setCheckoutProgress", phase: "ready" },
        ]);
      }
    },
    [controller, enqueueActions]
  );

  const handleToolComplete = useCallback(
    (event: VapiToolEvent) => {
      const dedupeKey = buildToolDedupeKey(event);
      if (processedToolResultsRef.current.has(dedupeKey)) return;
      processedToolResultsRef.current.add(dedupeKey);

      const actions = resolveUiActions(
        event.toolName,
        event.parameters,
        event.result
      );
      enqueueActions(actions);
    },
    [enqueueActions]
  );

  useEffect(() => {
    const pending = controller.pendingScroll ?? pendingScrollRef.current;
    if (!pending) return;

    const targetId = SCROLL_TARGET_IDS[pending.target];
    const timer = window.setTimeout(() => {
      scrollToElement(targetId);
      pendingScrollRef.current = null;
    }, 400);

    return () => window.clearTimeout(timer);
  }, [pathname, controller.pendingScroll]);

  return {
    handleToolStart,
    handleToolComplete,
    enqueueActions,
  };
}
