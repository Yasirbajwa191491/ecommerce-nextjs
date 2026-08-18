import type { VapiActivityPhase } from "@/lib/vapi-ui-actions/types";
import { getActivityPhaseForTool, getToolActivityTitle } from "@/lib/vapi-ui-actions/activity-phases";
import { isValidStripeCheckoutUrl } from "@/lib/vapi-config";
import { formatCurrencyAmount } from "@/lib/currencies";

export type VapiActivityStatus = "active" | "complete" | "error";

export type VapiActivityStep = {
  id: string;
  toolCallId?: string;
  toolName: string;
  status: VapiActivityStatus;
  title: string;
  detail?: string;
  href?: string;
  phase?: VapiActivityPhase;
  timestamp: number;
};

export type VapiToolEvent = {
  toolCallId: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: unknown;
};

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }
  return {};
}

export function parseToolResultPayload(result: unknown): Record<string, unknown> | null {
  if (typeof result === "object" && result !== null) {
    return result as Record<string, unknown>;
  }
  if (typeof result === "string") {
    try {
      const parsed: unknown = JSON.parse(result);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function extractToolCallsFromMessage(
  message: Record<string, unknown>
): VapiToolEvent[] {
  const rawList =
    message.toolCallList ??
    message.toolWithToolCallList ??
    message.tools;

  if (!Array.isArray(rawList)) return [];

  const events: VapiToolEvent[] = [];

  for (const item of rawList) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const nestedToolCall =
      typeof record.toolCall === "object" && record.toolCall !== null
        ? (record.toolCall as Record<string, unknown>)
        : null;

    const toolCallId = String(
      record.id ??
        nestedToolCall?.id ??
        record.toolCallId ??
        `${Date.now()}-${events.length}`
    );

    const toolName = String(
      record.name ??
        (typeof record.function === "object" &&
        record.function !== null &&
        "name" in record.function
          ? String((record.function as { name?: unknown }).name ?? "")
          : "") ??
        nestedToolCall?.name ??
        "unknown"
    );

    const parameters = parseJsonRecord(
      record.parameters ??
        record.arguments ??
        nestedToolCall?.parameters ??
        nestedToolCall?.arguments
    );

    events.push({ toolCallId, toolName, parameters });
  }

  return events;
}

export function extractToolResultsFromMessage(
  message: Record<string, unknown>
): VapiToolEvent[] {
  const events: VapiToolEvent[] = [];
  const seen = new Set<string>();

  const push = (
    toolCallId: string,
    toolName: string,
    result: unknown,
    parameters: Record<string, unknown> = {}
  ) => {
    if (result === undefined || result === null) return;
    if (seen.has(toolCallId)) return;
    seen.add(toolCallId);
    events.push({
      toolCallId,
      toolName,
      parameters,
      result,
    });
  };

  const rawList = message.toolCallResultList ?? message.results;
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      const nestedToolCall =
        typeof record.toolCall === "object" && record.toolCall !== null
          ? (record.toolCall as Record<string, unknown>)
          : null;

      push(
        String(record.toolCallId ?? record.id ?? nestedToolCall?.id ?? `${Date.now()}-${events.length}`),
        String(
          record.name ??
            record.toolName ??
            nestedToolCall?.name ??
            (typeof record.function === "object" &&
            record.function !== null &&
            "name" in record.function
              ? String((record.function as { name?: unknown }).name ?? "")
              : "") ??
            "unknown"
        ),
        record.result ?? record.output ?? nestedToolCall?.result ?? null,
        parseJsonRecord(
          record.parameters ??
            record.arguments ??
            nestedToolCall?.parameters ??
            nestedToolCall?.arguments
        )
      );
    }
  }

  const withCalls = message.toolWithToolCallList;
  if (Array.isArray(withCalls)) {
    for (const item of withCalls) {
      if (typeof item !== "object" || item === null) continue;
      const record = item as Record<string, unknown>;
      const nestedToolCall =
        typeof record.toolCall === "object" && record.toolCall !== null
          ? (record.toolCall as Record<string, unknown>)
          : null;
      const result = record.result ?? nestedToolCall?.result ?? record.output;
      if (result === undefined || result === null) continue;

      push(
        String(nestedToolCall?.id ?? record.id ?? `${Date.now()}-${events.length}`),
        String(
          record.name ??
            nestedToolCall?.name ??
            (typeof record.function === "object" &&
            record.function !== null &&
            "name" in record.function
              ? String((record.function as { name?: unknown }).name ?? "")
              : "") ??
            "unknown"
        ),
        result,
        parseJsonRecord(
          record.parameters ??
            record.arguments ??
            nestedToolCall?.parameters ??
            nestedToolCall?.arguments
        )
      );
    }
  }

  const rootResult = message.result ?? message.output;
  if (rootResult !== undefined && rootResult !== null) {
    push(
      String(message.toolCallId ?? message.id ?? `root-${Date.now()}`),
      String(message.name ?? message.toolName ?? "unknown"),
      rootResult
    );
  }

  return events;
}

export function getStripeCheckoutUrlFromSteps(
  steps: VapiActivityStep[]
): string | undefined {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (
      step?.toolName !== "createCheckoutSession" ||
      step.status !== "complete" ||
      !step.href
    ) {
      continue;
    }
    const base = step.href.split("#")[0] ?? step.href;
    if (isValidStripeCheckoutUrl(base)) {
      return step.href;
    }
  }
  return undefined;
}

function productHref(productId: string | undefined): string | undefined {
  if (!productId) return undefined;
  return `/product/${productId}`;
}

function firstProductFromSearch(result: Record<string, unknown>): {
  name?: string;
  id?: string;
} {
  const products = result.products;
  if (!Array.isArray(products) || products.length === 0) return {};
  const first = products[0];
  if (typeof first !== "object" || first === null) return {};
  const record = first as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : undefined,
    id: typeof record.id === "string" ? record.id : undefined,
  };
}

export function buildUnderstandingStep(): VapiActivityStep {
  return {
    id: `understanding-${Date.now()}`,
    toolName: "user_request",
    status: "active",
    title: "Understanding request",
    phase: "understanding",
    timestamp: Date.now(),
  };
}

export function buildActivityStepStart(
  event: VapiToolEvent
): VapiActivityStep {
  const { toolName, parameters, toolCallId } = event;
  const phase = getActivityPhaseForTool(toolName);

  const base = {
    id: toolCallId,
    toolCallId,
    toolName,
    status: "active" as const,
    phase,
    title: phase ? getToolActivityTitle(toolName, phase) : "Working on your request",
    timestamp: Date.now(),
  };

  switch (toolName) {
    case "searchProducts":
    case "searchProductsHybrid":
      return {
        ...base,
        detail:
          typeof parameters.query === "string"
            ? `"${parameters.query}"`
            : undefined,
      };
    case "getProductDetails":
      return {
        ...base,
        href: productHref(String(parameters.productId ?? "")),
      };
    case "buildProductBundle":
      return {
        ...base,
        detail:
          typeof parameters.query === "string" ? parameters.query : undefined,
      };
    case "addToCart":
      if (Array.isArray(parameters.productIds)) {
        return {
          ...base,
          detail: `${parameters.productIds.length} products`,
        };
      }
      return {
        ...base,
        href: productHref(String(parameters.productId ?? "")),
      };
    case "getCart":
      return base;
    case "removeFromCart":
      return {
        ...base,
        detail: parameters.clearAll ? "Clearing all items" : undefined,
      };
    case "createCheckoutSession":
      return {
        ...base,
        detail: "Card payment (Stripe)",
      };
    case "createCashOrder":
      return {
        ...base,
        detail: "Cash on delivery",
      };
    case "trackOrder":
      return {
        ...base,
        detail:
          typeof parameters.orderNumber === "string"
            ? parameters.orderNumber
            : undefined,
      };
    default:
      return base;
  }
}

export function finalizeActivityStep(
  step: VapiActivityStep,
  event: VapiToolEvent
): VapiActivityStep {
  const payload = parseToolResultPayload(event.result);
  const errorMessage =
    payload && typeof payload.error === "string" ? payload.error : null;

  if (errorMessage) {
    return {
      ...step,
      status: "error",
      detail: errorMessage,
    };
  }

  const { toolName } = event;
  const params = event.parameters;

  switch (toolName) {
    case "searchProducts":
    case "searchProductsHybrid": {
      const hit = payload ? firstProductFromSearch(payload) : {};
      const count =
        payload && Array.isArray(payload.products)
          ? payload.products.length
          : undefined;
      return {
        ...step,
        status: "complete",
        title: "Products found",
        detail:
          count !== undefined
            ? `${count} result${count === 1 ? "" : "s"}${hit.name ? ` · ${hit.name}` : ""}`
            : hit.name,
        href: productHref(hit.id),
      };
    }
    case "getProductDetails":
      return {
        ...step,
        status: "complete",
        title: "Product selected",
        detail:
          payload && typeof payload.name === "string"
            ? payload.name
            : step.detail,
        href: productHref(
          typeof payload?.id === "string"
            ? payload.id
            : String(params.productId ?? "")
        ),
      };
    case "buildProductBundle":
      return {
        ...step,
        status: "complete",
        title: "Bundle ready",
        detail:
          payload && typeof payload.total === "number"
            ? `Total: ${formatCurrencyAmount(payload.total, String(payload.currency ?? "USD"))}`
            : step.detail,
      };
    case "addToCart":
      if (payload && Array.isArray(payload.addedItems)) {
        return {
          ...step,
          status: "complete",
          title: "Bundle added to cart",
          detail: Array.isArray(payload.added)
            ? payload.added.join(", ")
            : step.detail,
        };
      }
      return {
        ...step,
        status: "complete",
        title: "Added to cart",
        detail:
          payload && typeof payload.productName === "string"
            ? payload.productName
            : step.detail,
        href: productHref(
          typeof payload?.productId === "string"
            ? payload.productId
            : String(params.productId ?? "")
        ),
      };
    case "getCart":
      return {
        ...step,
        status: "complete",
        title: "Cart updated",
        detail:
          payload && typeof payload.itemCount === "number"
            ? `${payload.itemCount} item${payload.itemCount === 1 ? "" : "s"}`
            : step.detail,
      };
    case "removeFromCart":
      return {
        ...step,
        status: "complete",
        title: payload?.clearedAll ? "Cart cleared" : "Removed from cart",
        detail:
          typeof payload?.message === "string" ? payload.message : step.detail,
      };
    case "createCheckoutSession": {
      const checkoutUrl =
        typeof payload?.checkoutUrl === "string"
          ? payload.checkoutUrl
          : typeof payload?.url === "string"
            ? payload.url
            : undefined;
      const base = checkoutUrl?.split("#")[0] ?? checkoutUrl;
      const validUrl =
        checkoutUrl && base && isValidStripeCheckoutUrl(base)
          ? checkoutUrl
          : undefined;
      return {
        ...step,
        status: "complete",
        title: "Checkout ready",
        detail:
          payload && typeof payload.orderNumber === "string"
            ? `Order ${payload.orderNumber}`
            : step.detail,
        href: validUrl ?? step.href,
      };
    }
    case "createCashOrder":
      return {
        ...step,
        status: "complete",
        title: "Order placed",
        detail:
          payload && typeof payload.orderNumber === "string"
            ? `Order ${payload.orderNumber}`
            : step.detail,
      };
    case "trackOrder":
      return {
        ...step,
        status: "complete",
        title: "Order status loaded",
        detail:
          payload && typeof payload.status === "string"
            ? payload.status
            : step.detail,
      };
    default:
      return {
        ...step,
        status: "complete",
        detail:
          payload && typeof payload.message === "string"
            ? payload.message
            : step.detail,
      };
  }
}
