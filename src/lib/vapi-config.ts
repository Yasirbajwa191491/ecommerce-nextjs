export function getVapiPublicKey(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY?.trim() || undefined;
}

export function getVapiAssistantId(): string | undefined {
  return process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim() || undefined;
}

export function isVapiConfigured(): boolean {
  return Boolean(getVapiPublicKey() && getVapiAssistantId());
}

export type VapiAssistantState =
  | "idle"
  | "listening"
  | "speaking"
  | "processing";

export type VapiTranscriptEntry = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  linkUrl?: string;
  assistantTurn?: number;
};

export {
  collapseVoiceSpacingArtifacts,
  extractCheckoutUrl,
  extractOrderNumber,
  isStructuredToolMessage,
  isValidStripeCheckoutUrl,
  looksLikeVoiceSpacingArtifact,
  normalizeAssistantDisplayText,
  normalizeOrderNumbersInText,
} from "./vapi-display-normalize";

import {
  extractCheckoutUrl,
  isStructuredToolMessage,
  isValidStripeCheckoutUrl,
} from "./vapi-display-normalize";

function extractOpenAiContent(content: unknown): string | null {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part === "object" && part !== null && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("")
      .trim();
    return text.length > 0 ? text : null;
  }

  return null;
}

export function extractLatestAssistantText(
  messages: unknown
): string | null {
  if (!Array.isArray(messages)) return null;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const entry = messages[index];
    if (typeof entry !== "object" || entry === null) continue;

    const role = "role" in entry ? entry.role : null;
    if (role !== "assistant") continue;

    const content =
      "content" in entry
        ? extractOpenAiContent(entry.content)
        : "message" in entry && typeof entry.message === "string"
          ? entry.message.trim()
          : null;

    if (content) return content;
  }

  return null;
}

type ToolResultPayload = Record<string, unknown>;

function parseToolResultPayload(result: unknown): ToolResultPayload | null {
  if (typeof result === "object" && result !== null) {
    return result as ToolResultPayload;
  }

  if (typeof result === "string") {
    try {
      const parsed: unknown = JSON.parse(result);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as ToolResultPayload;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function formatMoney(currency: unknown, amount: unknown): string | null {
  if (typeof amount !== "number") return null;
  return `${String(currency ?? "USD")} ${amount.toFixed(2)}`;
}

function formatProductSummary(payload: ToolResultPayload): {
  text: string;
  linkUrl?: string;
} | null {
  if (typeof payload.name !== "string") return null;

  const price = formatMoney(payload.currency, payload.finalPrice ?? payload.price);
  const lines = [
    `Product: ${payload.name}`,
    price ? `Price: ${price}` : null,
    typeof payload.inStock === "boolean"
      ? `In stock: ${payload.inStock ? "Yes" : "No"}`
      : null,
    typeof payload.stock === "number" ? `Stock: ${payload.stock} units` : null,
    typeof payload.description === "string"
      ? `Description: ${payload.description}`
      : null,
    typeof payload.shippingInfo === "string"
      ? `Shipping: ${payload.shippingInfo}`
      : null,
    typeof payload.id === "string" ? `Product ID: ${payload.id}` : null,
  ].filter(Boolean);

  const url = typeof payload.url === "string" ? payload.url : undefined;
  if (url) lines.push(`View: ${url}`);

  return { text: lines.join("\n"), linkUrl: url };
}

function formatCheckoutSessionCard(
  payload: ToolResultPayload
): { text: string; linkUrl?: string } | null {
  if (typeof payload.orderNumber !== "string") return null;

  const rawUrl =
    typeof payload.checkoutUrl === "string"
      ? payload.checkoutUrl
      : typeof payload.url === "string"
        ? payload.url
        : undefined;

  const checkoutUrl =
    rawUrl &&
    isValidStripeCheckoutUrl(rawUrl.split("#")[0] ?? rawUrl)
      ? rawUrl
      : undefined;
  const total = formatMoney(payload.currency, payload.total);

  return {
    text: [
      "Checkout ready!",
      `Order number: ${payload.orderNumber}`,
      total ? `Total: ${total}` : null,
      "Payment: Card (Stripe)",
      checkoutUrl
        ? "Use the button below to pay securely on Stripe."
        : "Stripe checkout link is unavailable. Please try checkout on the website.",
    ]
      .filter(Boolean)
      .join("\n"),
    linkUrl: checkoutUrl,
  };
}

export function extractCheckoutUrlFromToolResult(
  result: unknown
): string | undefined {
  const payload = parseToolResultPayload(result);
  if (!payload || typeof payload.error === "string") return undefined;

  const rawUrl =
    typeof payload.checkoutUrl === "string"
      ? payload.checkoutUrl
      : typeof payload.url === "string"
        ? payload.url
        : undefined;

  if (!rawUrl) return undefined;
  const base = rawUrl.split("#")[0] ?? rawUrl;
  return isValidStripeCheckoutUrl(base) ? rawUrl : undefined;
}

export function isCheckoutRelatedMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("checkout ready") ||
    lower.includes("stripe button") ||
    lower.includes("stripe checkout") ||
    (lower.includes("stripe") && /ORD-\d{8}-[A-Z0-9]{6}/i.test(text))
  );
}

export function formatToolResultForDisplay(
  toolName: string,
  result: unknown
): { text: string; linkUrl?: string } | null {
  const payload = parseToolResultPayload(result);
  if (!payload || typeof payload.error === "string") return null;

  const isCheckoutSession =
    toolName === "createCheckoutSession" ||
    (typeof payload.checkoutUrl === "string" &&
      typeof payload.orderNumber === "string");

  if (isCheckoutSession) {
    return formatCheckoutSessionCard(payload);
  }

  if (toolName === "getProductDetails") {
    return formatProductSummary(payload);
  }

  if (toolName === "searchProducts" || toolName === "searchProductsHybrid") {
    const products = payload.products;
    if (Array.isArray(products) && products.length > 0) {
      const first = products[0];
      if (typeof first === "object" && first !== null) {
        const formatted = formatProductSummary(first as ToolResultPayload);
        if (formatted) {
          const count =
            typeof payload.count === "number"
              ? payload.count
              : typeof payload.totalCount === "number"
                ? payload.totalCount
                : products.length;
          return {
            text: `Products found: ${count}\n\n${formatted.text}`,
            linkUrl: formatted.linkUrl,
          };
        }
      }
    }
  }

  if (toolName === "addToCart" && typeof payload.productName === "string") {
    const lines = [
      "Added to cart:",
      `Product: ${payload.productName}`,
      typeof payload.color === "string" ? `Color: ${payload.color}` : null,
      typeof payload.quantity === "number" ? `Quantity: ${payload.quantity}` : null,
      typeof payload.cartItemCount === "number"
        ? `Cart items: ${payload.cartItemCount}`
        : null,
    ].filter(Boolean);
    const href =
      typeof payload.productId === "string"
        ? `/product/${payload.productId}`
        : undefined;
    return { text: lines.join("\n"), linkUrl: href };
  }

  if (toolName === "createCashOrder" && typeof payload.orderNumber === "string") {
    const total = formatMoney(payload.currency, payload.total);
    return {
      text: [
        "Order confirmed!",
        `Order number: ${payload.orderNumber}`,
        total ? `Total: ${total}` : null,
        "Payment: Cash on delivery",
        "Pay when your order arrives.",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  }

  if (typeof payload.message === "string" && payload.message.trim()) {
    const message = payload.message.trim();
    const checkoutUrl = extractCheckoutUrl(message);
    return {
      text: message,
      linkUrl: checkoutUrl,
    };
  }

  return null;
}

export function looksLikeSpelledOutIdentifier(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bo\s+r\s+d\b/.test(normalized) ||
    /\bord\s+dash\b/.test(normalized) ||
    /\bzero\s+zero\s+two\s+six\b/.test(normalized) ||
    /\b(one|two|three|four|five|six|seven|eight|nine)\s+(one|two|three|four|five|six|seven|eight|nine)\s+(one|two|three|four|five|six|seven|eight|nine)\b/.test(
      normalized
    )
  );
}

export function isStructuredOrderMessage(text: string): boolean {
  return isStructuredToolMessage(text);
}
