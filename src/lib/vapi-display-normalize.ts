/** Fixes TTS spacing artifacts in chat display (URLs, IDs, order numbers, etc.). */

/** ORD-YYYYMMDD-XXXXXX (6-char suffix from generateOrderNumber). */
export const ORDER_NUMBER_REGEX = /ORD-\d{8}-[A-Z0-9]{6}/gi;

export function extractOrderNumber(text: string): string | undefined {
  const compact = text.replace(/\s+/g, "").toUpperCase();
  const glued = compact.replace(/^(ORD-\d{8}-[A-Z0-9]{6})\.\d{1,2}$/, "$1");
  const match = glued.match(/ORD-\d{8}-[A-Z0-9]{6}/);
  return match?.[0];
}

export function isValidStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "checkout.stripe.com") return false;
    return /^\/c\/pay\/cs_(test|live)_[a-zA-Z0-9]+$/.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function normalizeOrderNumbersInText(text: string): string {
  let out = text.replace(/\s+/g, " ");

  out = out.replace(
    /ORDER\s*NUMBER\s*IS\s*(ORD[\s-]*\d[\s\d-]*[\s-]*[A-Z0-9\s]+)/gi,
    (_, raw: string) => {
      const extracted = extractOrderNumber(raw);
      return extracted ? `Order number: ${extracted}` : raw;
    }
  );

  out = out.replace(/ORDERNUMBERIS(ORD[\dA-Z\s-]+)/gi, (_, raw: string) => {
    const extracted = extractOrderNumber(raw);
    return extracted ? `Order number: ${extracted}` : raw;
  });

  // Price cents glued to suffix: ORD-20260614-LL3UQ0.00
  out = out.replace(/ORD-\d{8}-[A-Z0-9]{6}\.\d{1,2}\b/gi, (match) => {
    const extracted = extractOrderNumber(match);
    return extracted ?? match.replace(/\.\d{1,2}$/, "");
  });

  // TTS glues extra words onto the suffix: ORD-20260614-VSJYWTFORTHEHPLAPTOP...
  out = out.replace(/ORD-\d{8}-[A-Z0-9]{6}[A-Z]+/gi, (match) => {
    const extracted = extractOrderNumber(match);
    return extracted ?? match.slice(0, 19);
  });

  out = out.replace(
    /\b(?:Your\s+)?Order\s+number:\s*(ORD-\d{8}-[A-Z0-9]{6})(?:\.\d{1,2})?\b/gi,
    (_, ord: string) => `Order number: ${ord.toUpperCase()}`
  );

  out = out.replace(/\bORD(?:[\s-]*\d[\s\d-]*[\s-]*[A-Z0-9\s]+)/gi, (match) => {
    const extracted = extractOrderNumber(match);
    return extracted ?? match.replace(/\s+/g, "").toUpperCase();
  });

  return out;
}

export function stripSpokenStripeUrlsFromText(text: string): string {
  let out = text;

  out = out.replace(
    /https?:\/\/(?:checkout\s*\.\s*stripe\s*\.\s*com|checkout\.stripe\.com)[^\s]*/gi,
    (match) => {
      const compact = match.replace(/\s+/g, "");
      return isValidStripeCheckoutUrl(compact) ? compact : "";
    }
  );

  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

export function normalizeMoneyInText(text: string): string {
  return text
    .replace(/(\d+)\.\s+(\d{1,2})\b/g, (_, whole, cents) => {
      const padded = cents.length === 1 ? `${cents}0` : cents;
      return `${whole}.${padded}`;
    })
    .replace(/\bUSD\s+(\d+\.\d{2})\b/g, (_, amount) => `USD ${amount}`);
}

export function normalizeHexColorsInText(text: string): string {
  return text.replace(/#\s*(?:[0-9A-Fa-f]\s*){3,8}\b/g, (match) =>
    `#${match.slice(1).replace(/\s/g, "").toUpperCase()}`
  );
}

export function normalizeUrlsInText(text: string): string {
  let out = text;

  out = out.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, label: string, url: string) => {
    const cleanUrl = url.replace(/\s+/g, "");
    return `[${label}](${cleanUrl})`;
  });

  out = out.replace(/https?:\/\/[^\s)\]>]+(?:\s+[^\s)\]>]+)*/gi, (match) =>
    match.replace(/\s+/g, "")
  );

  out = out.replace(
    /localhost:\s*\d+(?:\s*\/\s*product\s*\/\s*[a-z0-9\s]+)?/gi,
    (match) => match.replace(/\s+/g, "")
  );

  out = out.replace(/\/product\/([a-z0-9\s]+)/gi, (_, id: string) =>
    `/product/${id.replace(/\s+/g, "")}`
  );

  return out;
}

export function normalizeEmailsInText(text: string): string {
  return text.replace(
    /([a-z0-9._%+-])\s+(@)\s*([a-z0-9.-]+\.[a-z]{2,})/gi,
    "$1$2$3"
  );
}

export function normalizePhoneNumbersInText(text: string): string {
  return text.replace(/(\+\d{1,3})\s+(\d[\d\s]{6,}\d)/g, (_, prefix, rest) =>
    `${prefix}${rest.replace(/\s+/g, "")}`
  );
}

export function collapseVoiceSpacingArtifacts(text: string): string {
  let out = text.replace(/\r\n/g, "\n");

  out = normalizeOrderNumbersInText(out);
  out = normalizeUrlsInText(out);
  out = stripSpokenStripeUrlsFromText(out);
  out = normalizeHexColorsInText(out);
  out = normalizeEmailsInText(out);
  out = normalizePhoneNumbersInText(out);
  out = normalizeMoneyInText(out);

  return out.trim();
}

export function extractCheckoutUrl(text: string): string | undefined {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(
    /https:\/\/checkout\.stripe\.com\/c\/pay\/cs_(?:test|live)_[a-zA-Z0-9]+(?:#.*)?/i
  );
  const candidate = match?.[0];
  if (!candidate) return undefined;
  const withoutHash = candidate.split("#")[0] ?? candidate;
  return isValidStripeCheckoutUrl(withoutHash) ? withoutHash : undefined;
}

export function looksLikeVoiceSpacingArtifact(text: string): boolean {
  if (looksLikeSpelledOutOrder(text)) return true;

  const compact = text.replace(/\s+/g, "");
  if (/https?:\/\//i.test(text) && /\s/.test(text) && /https?:\/\//i.test(compact)) {
    return true;
  }
  if (/checkout\.stripe\.com/i.test(compact)) return true;
  if (/localhost:\d+\/product\/[a-z0-9]+/i.test(compact)) return true;
  if (/\bORD(?:[\s-]*[A-Z0-9]){3,}/i.test(text)) return true;
  if (/ORDER\s*NUMBER\s*IS/i.test(text) || /ORDERNUMBERIS/i.test(text)) return true;
  if (/#\s*(?:[0-9A-Fa-f]\s+){3,}/.test(text)) return true;

  return false;
}

function looksLikeSpelledOutOrder(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bo\s+r\s+d\b/.test(normalized) ||
    /\bord\s+dash\b/.test(normalized) ||
    /\bzero\s+zero\s+two\s+six\b/.test(normalized)
  );
}

export function isStructuredToolMessage(text: string): boolean {
  const markers = [
    "Order number: ORD-",
    "Order confirmed!",
    "Checkout ready!",
    "Product:",
    "Added to cart:",
    "Products found:",
    "Payment: Card (Stripe)",
    "Payment: Cash on delivery",
  ];
  return markers.some((marker) => text.includes(marker));
}

export function normalizeAssistantDisplayText(text: string): string {
  return collapseVoiceSpacingArtifacts(text);
}
