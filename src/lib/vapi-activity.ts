export type VapiActivityStatus = "active" | "complete" | "error";

export type VapiActivityStep = {
  id: string;
  toolCallId?: string;
  toolName: string;
  status: VapiActivityStatus;
  title: string;
  detail?: string;
  href?: string;
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
  const rawList = message.toolCallResultList ?? message.results;
  if (!Array.isArray(rawList)) return [];

  const events: VapiToolEvent[] = [];

  for (const item of rawList) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;

    const toolCallId = String(record.toolCallId ?? record.id ?? `${Date.now()}-${events.length}`);
    const toolName = String(record.name ?? record.toolName ?? "unknown");
    const result = record.result ?? record.output ?? null;

    events.push({
      toolCallId,
      toolName,
      parameters: {},
      result,
    });
  }

  return events;
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

export function buildActivityStepStart(
  event: VapiToolEvent
): VapiActivityStep {
  const { toolName, parameters, toolCallId } = event;

  const base = {
    id: toolCallId,
    toolCallId,
    toolName,
    status: "active" as const,
    timestamp: Date.now(),
  };

  switch (toolName) {
    case "searchProducts":
    case "searchProductsHybrid":
      return {
        ...base,
        title: "Searching products",
        detail:
          typeof parameters.query === "string"
            ? `"${parameters.query}"`
            : undefined,
      };
    case "getProductDetails":
      return {
        ...base,
        title: "Viewing product details",
        href: productHref(String(parameters.productId ?? "")),
      };
    case "buildProductBundle":
      return {
        ...base,
        title: "Building product bundle",
        detail:
          typeof parameters.query === "string" ? parameters.query : undefined,
      };
    case "addToCart":
      if (Array.isArray(parameters.productIds)) {
        return {
          ...base,
          title: "Adding bundle to cart",
          detail: `${parameters.productIds.length} products`,
        };
      }
      return {
        ...base,
        title: "Adding to cart",
        href: productHref(String(parameters.productId ?? "")),
      };
    case "getCart":
      return {
        ...base,
        title: "Checking your cart",
      };
    case "removeFromCart":
      return {
        ...base,
        title: parameters.clearAll ? "Clearing cart" : "Removing from cart",
      };
    case "createCheckoutSession":
      return {
        ...base,
        title: "Starting checkout",
        detail: "Card payment (Stripe)",
      };
    case "createCashOrder":
      return {
        ...base,
        title: "Placing order",
        detail: "Cash on delivery",
      };
    case "trackOrder":
      return {
        ...base,
        title: "Tracking order",
        detail:
          typeof parameters.orderNumber === "string"
            ? parameters.orderNumber
            : undefined,
      };
    default:
      return {
        ...base,
        title: "Working on your request",
      };
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
            ? `Total: ${String(payload.currency ?? "USD")} ${payload.total.toFixed(2)}`
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
    case "createCheckoutSession":
      return {
        ...step,
        status: "complete",
        title: "Checkout ready",
        detail:
          payload && typeof payload.orderNumber === "string"
            ? `Order ${payload.orderNumber}`
            : step.detail,
        href:
          typeof payload?.checkoutUrl === "string"
            ? payload.checkoutUrl
            : step.href,
      };
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
