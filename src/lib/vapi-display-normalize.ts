/** Fixes TTS spacing artifacts in chat display (URLs, IDs, order numbers, etc.). */

export function normalizeOrderNumbersInText(text: string): string {
  let out = text.replace(
    /ORDER\s*NUMBER\s*IS\s*(ORD(?:[\s-]*[A-Z0-9]+)+)/gi,
    (_, ord: string) => ord.replace(/\s+/g, "").toUpperCase()
  );

  out = out.replace(
    /ORDERNUMBERIS(ORD(?:[\s-]*[A-Z0-9]+)+)/gi,
    (_, ord: string) => `Order number: ${ord.replace(/\s+/g, "").toUpperCase()}`
  );

  out = out.replace(/\b(ORD(?:[\s-]*[A-Z0-9]+)+)/gi, (match) =>
    match.replace(/\s+/g, "").toUpperCase()
  );

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

  out = normalizeUrlsInText(out);
  out = normalizeOrderNumbersInText(out);
  out = normalizeHexColorsInText(out);
  out = normalizeEmailsInText(out);
  out = normalizePhoneNumbersInText(out);
  out = normalizeMoneyInText(out);

  return out.trim();
}

export function extractCheckoutUrl(text: string): string | undefined {
  const compact = text.replace(/\s+/g, "");
  const match = compact.match(/https:\/\/checkout\.stripe\.com\/[^\s)"'\]]+/i);
  return match?.[0];
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
