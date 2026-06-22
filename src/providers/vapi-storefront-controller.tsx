"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CheckoutProgressPhase,
  CompareProductSummary,
  GuidedShoppingPreferences,
  ScrollTarget,
  UiAction,
} from "@/lib/vapi-ui-actions/types";

export type VapiStorefrontState = {
  aiSearchLoading: boolean;
  highlightedProductIds: Set<string>;
  compareProducts: CompareProductSummary[];
  compareSheetOpen: boolean;
  checkoutProgress: CheckoutProgressPhase | null;
  checkoutActive: boolean;
  voiceDeliveryMethod: string | null;
  guidedShopping: {
    active: boolean;
    preferences: GuidedShoppingPreferences;
  };
  pendingScroll: { target: ScrollTarget; productId?: string } | null;
  trackOrderPrefill: {
    orderNumber?: string;
    email?: string;
    phone?: string;
    activeTab?: "order-number" | "customer";
    autoSubmit?: boolean;
    requestId?: number;
  } | null;
  executorBusy: boolean;
  assistantCheckoutActive: boolean;
};

type VapiStorefrontControllerValue = VapiStorefrontState & {
  applyUiAction: (action: UiAction) => void;
  applyUiActions: (actions: UiAction[]) => void;
  setExecutorBusy: (busy: boolean) => void;
  setAssistantCheckoutActive: (active: boolean) => void;
  clearHighlights: () => void;
  dismissCompareSheet: () => void;
};

const defaultPreferences: GuidedShoppingPreferences = {};

const initialState: VapiStorefrontState = {
  aiSearchLoading: false,
  highlightedProductIds: new Set(),
  compareProducts: [],
  compareSheetOpen: false,
  checkoutProgress: null,
  checkoutActive: false,
  voiceDeliveryMethod: null,
  guidedShopping: { active: false, preferences: defaultPreferences },
  pendingScroll: null,
  trackOrderPrefill: null,
  executorBusy: false,
  assistantCheckoutActive: false,
};

const VapiStorefrontContext =
  createContext<VapiStorefrontControllerValue | null>(null);

export function VapiStorefrontControllerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<VapiStorefrontState>(initialState);
  const mergePrefsRef = useRef<GuidedShoppingPreferences>({});

  const applyUiAction = useCallback((action: UiAction) => {
    switch (action.type) {
      case "setAiSearchLoading":
        setState((prev) => ({ ...prev, aiSearchLoading: action.loading }));
        break;
      case "highlightProducts":
        setState((prev) => ({
          ...prev,
          highlightedProductIds: new Set(action.productIds),
        }));
        break;
      case "compareProducts":
        setState((prev) => ({
          ...prev,
          highlightedProductIds: new Set(action.productIds),
          compareProducts: action.products ?? prev.compareProducts,
          compareSheetOpen: action.productIds.length >= 2,
        }));
        break;
      case "setCheckoutProgress":
        setState((prev) => ({
          ...prev,
          checkoutProgress: action.phase,
          checkoutActive: true,
          assistantCheckoutActive: true,
        }));
        break;
      case "prefillCheckoutDelivery":
        setState((prev) => ({
          ...prev,
          voiceDeliveryMethod: action.method,
          checkoutActive: true,
          assistantCheckoutActive: true,
        }));
        break;
      case "setGuidedShopping":
        mergePrefsRef.current = action.preferences ?? mergePrefsRef.current;
        setState((prev) => ({
          ...prev,
          guidedShopping: {
            active: action.active,
            preferences: action.preferences ?? prev.guidedShopping.preferences,
          },
        }));
        break;
      case "prefillTrackOrder":
        setState((prev) => ({
          ...prev,
          trackOrderPrefill: {
            orderNumber:
              action.orderNumber ?? prev.trackOrderPrefill?.orderNumber,
            email: action.email ?? prev.trackOrderPrefill?.email,
            phone: action.phone ?? prev.trackOrderPrefill?.phone,
            activeTab: action.activeTab ?? prev.trackOrderPrefill?.activeTab,
            autoSubmit: action.autoSubmit ?? false,
            requestId: action.autoSubmit
              ? (action.requestId ?? Date.now())
              : prev.trackOrderPrefill?.requestId,
          },
        }));
        break;
      case "scrollToTarget":
        setState((prev) => ({
          ...prev,
          pendingScroll: { target: action.target, productId: action.productId },
        }));
        break;
      case "navigateToProducts":
      case "applySearchFilters":
      case "openProductDetails":
      case "openCart":
      case "openCheckout":
        setState((prev) => ({
          ...prev,
          checkoutActive: action.type === "openCheckout" ? true : prev.checkoutActive,
          assistantCheckoutActive: true,
          checkoutProgress:
            action.type === "openCheckout" && action.phase
              ? action.phase
              : prev.checkoutProgress,
        }));
        break;
      case "openOrderConfirmed":
      case "openStripeCheckout":
      case "navigateToShopPage":
        break;
      case "openTrackOrder":
      case "openTrackOrderDetail":
        break;
      default:
        break;
    }
  }, []);

  const applyUiActions = useCallback(
    (actions: UiAction[]) => {
      for (const action of actions) {
        applyUiAction(action);
      }
    },
    [applyUiAction]
  );

  const setExecutorBusy = useCallback((busy: boolean) => {
    setState((prev) => ({ ...prev, executorBusy: busy }));
  }, []);

  const setAssistantCheckoutActive = useCallback((active: boolean) => {
    setState((prev) => ({ ...prev, assistantCheckoutActive: active }));
  }, []);

  const clearHighlights = useCallback(() => {
    setState((prev) => ({
      ...prev,
      highlightedProductIds: new Set(),
    }));
  }, []);

  const dismissCompareSheet = useCallback(() => {
    setState((prev) => ({ ...prev, compareSheetOpen: false }));
  }, []);

  const value = useMemo(
    (): VapiStorefrontControllerValue => ({
      ...state,
      applyUiAction,
      applyUiActions,
      setExecutorBusy,
      setAssistantCheckoutActive,
      clearHighlights,
      dismissCompareSheet,
    }),
    [
      state,
      applyUiAction,
      applyUiActions,
      setExecutorBusy,
      setAssistantCheckoutActive,
      clearHighlights,
      dismissCompareSheet,
    ]
  );

  return (
    <VapiStorefrontContext.Provider value={value}>
      {children}
    </VapiStorefrontContext.Provider>
  );
}

export function useVapiStorefrontController() {
  const ctx = useContext(VapiStorefrontContext);
  if (!ctx) {
    throw new Error(
      "useVapiStorefrontController must be used within VapiStorefrontControllerProvider"
    );
  }
  return ctx;
}

export function useVapiStorefrontOptional() {
  return useContext(VapiStorefrontContext);
}

export function isProductAiHighlighted(
  productId: string,
  highlighted: Set<string>
): boolean {
  return highlighted.has(productId);
}
