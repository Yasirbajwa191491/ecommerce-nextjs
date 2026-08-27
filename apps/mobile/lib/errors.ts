import { isLikelyOfflineError, OfflineError } from "@/lib/network";

export const MIXED_CURRENCY_CART_MESSAGE =
  "Your cart has items in different currencies. Remove items until only one currency remains, then continue to checkout.";

const FRIENDLY_ERROR_MAP: Record<string, string> = {
  "Your cart is empty": "Your cart is empty.",
  "Each cart item must have a selected color":
    "A cart item is missing required details. Try removing it and adding again.",
  "Invalid quantity in cart": "Something is wrong with an item quantity. Please update your cart.",
  "Unable to validate your cart": "We couldn't calculate your cart total. Please try again.",
  "All items must use the same currency": MIXED_CURRENCY_CART_MESSAGE,
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "An unexpected error occurred. Please try again.";
}

/** Strip Convex / server noise and return a clean message for UI. */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (error instanceof OfflineError) {
    return error.message.trim() || "You're offline. Connect to the internet and try again.";
  }

  const raw = getErrorMessage(error);
  const parsed = parseServerErrorMessage(raw);
  const mapped = FRIENDLY_ERROR_MAP[parsed] ?? FRIENDLY_ERROR_MAP[raw];
  if (mapped) return mapped;

  if (isLikelyOfflineError(error) || isLikelyOfflineError(parsed)) {
    return "You're offline. Connect to the internet and try again.";
  }

  if (parsed.length > 0 && parsed.length < 280 && !looksLikeRawServerDump(parsed)) {
    return parsed;
  }

  return fallback;
}

function looksLikeRawServerDump(message: string): boolean {
  return (
    /\[CONVEX/i.test(message) ||
    /Request ID:/i.test(message) ||
    /at async handler/i.test(message) ||
    /Called by client/i.test(message) ||
    /Server Error/i.test(message)
  );
}

function parseServerErrorMessage(raw: string): string {
  let message = raw.trim();

  message = message
    .replace(/\[CONVEX[^\]]*\]\s*/gi, "")
    .replace(/\[Request ID:[^\]]*\]\s*/gi, "")
    .replace(/\s*Called by client\s*$/i, "")
    .trim();

  const uncaught = message.match(
    /Uncaught\s+(?:APIError|ConvexError|Error):\s*(.+?)(?:\s+at\s+async|\s+at\s+|\s*$)/i
  );
  if (uncaught?.[1]) {
    return cleanTrailingStack(uncaught[1].trim());
  }

  if (/^Server Error\s*/i.test(message)) {
    message = message.replace(/^Server Error\s*/i, "").trim();
    const afterColon = message.match(/^(?:Uncaught\s+)?(?:\w+Error):\s*(.+)$/i);
    if (afterColon?.[1]) {
      return cleanTrailingStack(afterColon[1].trim());
    }
  }

  return cleanTrailingStack(message);
}

function cleanTrailingStack(message: string): string {
  return message
    .replace(/\s+at\s+async\s+handler.*$/i, "")
    .replace(/\s+at\s+.+:\d+:\d+.*$/i, "")
    .trim();
}

export function logAppError(
  error: unknown,
  context?: { segment?: string; digest?: string }
) {
  const message = getErrorMessage(error);
  console.error(
    context?.segment ? `[mobile:${context.segment}] ${message}` : `[mobile] ${message}`,
    error,
    context?.digest ? { digest: context.digest } : undefined
  );
}
