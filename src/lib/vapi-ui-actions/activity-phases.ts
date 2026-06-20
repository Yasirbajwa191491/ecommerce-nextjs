import type { VapiActivityPhase } from "./types";

const TOOL_PHASE_MAP: Record<string, VapiActivityPhase> = {
  searchProducts: "searching",
  searchProductsHybrid: "searching",
  recommendProducts: "searching",
  getBestSellers: "searching",
  buildProductBundle: "comparing",
  getProductDetails: "opening_product",
  getProductReviews: "opening_product",
  addToCart: "adding_to_cart",
  addMultipleToCart: "adding_to_cart",
  getCart: "adding_to_cart",
  removeFromCart: "adding_to_cart",
  getDeliveryOptions: "calculating_delivery",
  createCheckoutSession: "preparing_checkout",
  createCashOrder: "preparing_checkout",
  trackOrder: "tracking_order",
  getOrdersByEmail: "tracking_order",
};

export function getActivityPhaseForTool(toolName: string): VapiActivityPhase | undefined {
  return TOOL_PHASE_MAP[toolName];
}

export const ACTIVITY_PHASE_LABELS: Record<VapiActivityPhase, string> = {
  understanding: "Understanding request",
  searching: "Searching catalog",
  comparing: "Comparing products",
  opening_product: "Opening product",
  adding_to_cart: "Adding to cart",
  calculating_delivery: "Calculating delivery",
  preparing_checkout: "Preparing checkout",
  tracking_order: "Tracking order",
};

export function getActivityPhaseLabel(phase: VapiActivityPhase): string {
  return ACTIVITY_PHASE_LABELS[phase];
}

export function getToolActivityTitle(
  toolName: string,
  phase?: VapiActivityPhase
): string {
  if (phase) return getActivityPhaseLabel(phase);
  const mapped = getActivityPhaseForTool(toolName);
  if (mapped) return getActivityPhaseLabel(mapped);
  return "Working on your request";
}

export function inferAssistantStateFromTool(
  toolName: string
): "searching" | "updating_cart" | "checkout_ready" | "thinking" | null {
  if (
    toolName === "searchProducts" ||
    toolName === "searchProductsHybrid" ||
    toolName === "recommendProducts" ||
    toolName === "getBestSellers" ||
    toolName === "buildProductBundle"
  ) {
    return "searching";
  }
  if (
    toolName === "addToCart" ||
    toolName === "addMultipleToCart" ||
    toolName === "removeFromCart" ||
    toolName === "getCart"
  ) {
    return "updating_cart";
  }
  if (
    toolName === "createCheckoutSession" ||
    toolName === "createCashOrder"
  ) {
    return "checkout_ready";
  }
  return null;
}
