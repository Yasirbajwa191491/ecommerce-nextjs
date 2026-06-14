/** Fixes TTS spacing artifacts in chat display (URLs, IDs, order numbers, etc.). */

import {
  formatCurrencyAmount,
  isValidCurrencyCode,
} from "./currencies";

/** ORD-YYYYMMDD-XXXXXX (6-char suffix from generateOrderNumber). */
export const ORDER_NUMBER_REGEX = /ORD-\d{8}-[A-Z0-9]{6}/gi;

/** TTS may spell ISO codes letter-by-letter: P K R, U S D, E U R, … */
const SPACED_ISO_CURRENCY =
  /\b((?:[A-Za-z]\s*){3})\s+((?:\d[\d\s,]*)(?:\.\s*\d{1,2})?|\.\s*\d{1,2})/g;

/** Compact ISO code + spaced digit amount: PKR 1 2 6 2 5 0 */
const COMPACT_CURRENCY_SPACED_AMOUNT =
  /\b([A-Z]{3})\s+((?:\d[\d\s,]*)(?:\.\s*\d{1,2})?)/g;

/** Phrases before a spaced currency amount. */
const CURRENCY_AMOUNT_PHRASE =
  /\b((?:The\s+)?(?:total\s+amount\s+is|total\s+is|price\s+is|amount\s+is|Total:))\s+((?:[A-Za-z]\s*){3})\s+((?:\d[\d\s,]*)(?:\.\s*\d{1,2})?)/gi;

/** Long Convex-style IDs spoken with spaces between characters. */
const SPACED_ALPHANUMERIC_ID =
  /\b([a-z0-9](?:\s+[a-z0-9]){15,})\b/gi;

const SPOKEN_ONES: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const SPOKEN_TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

function parseSpokenNumberPhrase(phrase: string): string | null {
  const tokens = phrase.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  if (tokens.length === 1) {
    const word = tokens[0]!;
    if (word in SPOKEN_ONES) return String(SPOKEN_ONES[word]);
    if (word in SPOKEN_TENS) return String(SPOKEN_TENS[word]);
    return null;
  }

  if (tokens.length === 2) {
    const tens = SPOKEN_TENS[tokens[0]!];
    const ones = SPOKEN_ONES[tokens[1]!];
    if (tens !== undefined && ones !== undefined && ones < 10) {
      return String(tens + ones);
    }
  }

  return null;
}

/** Split a glued token like "fourYOXX" into spoken digit word + alphanumeric suffix. */
function splitSpokenWordFromSuffix(token: string): { digits: string; rest: string } | null {
  const lower = token.toLowerCase();
  const words = [
    ...Object.keys(SPOKEN_TENS),
    ...Object.keys(SPOKEN_ONES),
  ].sort((a, b) => b.length - a.length);

  for (const word of words) {
    if (!lower.startsWith(word) || lower.length <= word.length) continue;
    const rest = token.slice(word.length);
    if (!/^[A-Za-z0-9]+$/.test(rest)) continue;
    const digits = parseSpokenNumberPhrase(word);
    if (digits !== null) {
      return { digits, rest: rest.toUpperCase() };
    }
  }

  return null;
}

function normalizeOrderSuffixWithSpokenNumbers(rawSuffix: string): string {
  const trimmed = rawSuffix.trim();
  if (!trimmed) return trimmed;

  const compact = trimmed.replace(/\s+/g, "");
  if (/^[A-Z0-9]{6}$/i.test(compact)) {
    return compact.toUpperCase();
  }

  const tokens = trimmed.split(/\s+/);
  const digitParts: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    if (i + 1 < tokens.length) {
      const twoWord = parseSpokenNumberPhrase(`${tokens[i]} ${tokens[i + 1]}`);
      if (twoWord !== null) {
        digitParts.push(twoWord);
        i += 2;
        continue;
      }

      const tensWord = tokens[i]!.toLowerCase();
      if (tensWord in SPOKEN_TENS) {
        const gluedNext = splitSpokenWordFromSuffix(tokens[i + 1]!);
        if (gluedNext) {
          digitParts.push(String(SPOKEN_TENS[tensWord]! + Number.parseInt(gluedNext.digits, 10)));
          return `${digitParts.join("")}${gluedNext.rest}`;
        }
      }
    }

    const glued = splitSpokenWordFromSuffix(tokens[i]!);
    if (glued) {
      digitParts.push(glued.digits);
      return `${digitParts.join("")}${glued.rest}`;
    }

    const oneWord = parseSpokenNumberPhrase(tokens[i]!);
    if (oneWord !== null) {
      digitParts.push(oneWord);
      i += 1;
      continue;
    }

    return `${digitParts.join("")}${tokens.slice(i).join("").toUpperCase()}`;
  }

  return digitParts.join("").toUpperCase();
}

function collapseSpacedDigitRuns(text: string): string {
  return text.replace(/(\d)(?:\s+(\d))+/g, (match) => match.replace(/\s+/g, ""));
}

function collapseOrdDateDigits(text: string): string {
  return text.replace(
    /\bORD-\s*((?:\d\s*){8})(?=\s|minus|[a-zA-Z-]|$)/gi,
    (_, digits: string) => `ORD-${digits.replace(/\s+/g, "")}`
  );
}

function normalizeTtsHyphensAndOrd(text: string): string {
  let out = text;
  out = out.replace(/\bO\s*R\s*D\s*minus\b/gi, "ORD-");
  out = out.replace(/\bORD\s*minus\b/gi, "ORD-");
  out = out.replace(/\bord\s+dash\b/gi, "ORD-");
  out = collapseOrdDateDigits(out);
  out = normalizeTtsMinusSeparators(out);
  return out;
}

function normalizeTtsOrderArtifacts(text: string): string {
  let out = normalizeTtsHyphensAndOrd(text);

  out = out.replace(
    /\bORD-(\d{8})\s*-?\s*(.+?)(?=\.\s|\.$)/gi,
    (_, date: string, rawSuffix: string) => {
      const trimmed = rawSuffix.trim();
      const compact = trimmed.replace(/\s+/g, "").toUpperCase();
      const validPrefix = compact.match(/^[A-Z0-9]{6}/)?.[0];
      if (validPrefix && !/(?:MINUS|SEVENTY|SIXTY|FORTY|TWENTY|THIRTY|EIGHTY|NINETY)/.test(trimmed.toUpperCase())) {
        return `ORD-${date}-${validPrefix}`;
      }

      const suffix = normalizeOrderSuffixWithSpokenNumbers(trimmed);
      const cleaned = suffix.replace(/\s+/g, "").toUpperCase();
      const extracted = cleaned.match(/^[A-Z0-9]{6}/)?.[0] ?? cleaned.slice(0, 6);
      return `ORD-${date}-${extracted}`;
    }
  );

  out = out.replace(
    /\bORD\s+(?:(?:\d\s*){8})\s*-?\s*([A-Za-z0-9\s]+)/gi,
    (match) => {
      const extracted = extractOrderNumber(match);
      return extracted ?? match;
    }
  );

  return out;
}

function collapseSpacedAmount(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const dotIndex = trimmed.search(/\.\s*\d/);
  if (dotIndex >= 0) {
    const whole = trimmed.slice(0, dotIndex).replace(/[\s,]+/g, "");
    const frac = trimmed.slice(dotIndex + 1).replace(/[\s,]+/g, "");
    if (!whole) return `0.${frac.padEnd(2, "0").slice(0, 2)}`;
    return `${whole}.${frac.padEnd(2, "0").slice(0, 2)}`;
  }

  return trimmed.replace(/[\s,]+/g, "");
}

function parseCollapsedAmount(raw: string): number | null {
  const collapsed = collapseSpacedAmount(raw);
  if (!collapsed) return null;
  const num = Number.parseFloat(collapsed);
  return Number.isFinite(num) ? num : null;
}

function formatTtsCurrencyAmount(code: string, rawAmount: string): string {
  const num = parseCollapsedAmount(rawAmount);
  if (num === null) {
    return `${code} ${collapseSpacedAmount(rawAmount)}`;
  }
  if (isValidCurrencyCode(code)) {
    return formatCurrencyAmount(num, code);
  }
  const collapsed = collapseSpacedAmount(rawAmount);
  const hasDecimals = collapsed.includes(".");
  return `${code} ${num.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  })}`;
}

function collapseSpacedCurrencyCode(spacedCode: string): string {
  return spacedCode.replace(/\s+/g, "").toUpperCase();
}

function normalizeCurrencySpacing(text: string): string {
  let out = text;

  out = out.replace(
    CURRENCY_AMOUNT_PHRASE,
    (match, phrase: string, spacedCode: string, amount: string) => {
      const code = collapseSpacedCurrencyCode(spacedCode);
      if (!isValidCurrencyCode(code)) return match;
      const formatted = formatTtsCurrencyAmount(code, amount);
      const normalizedPhrase = phrase.replace(/^\s*the\s+/i, "The ");
      return `${normalizedPhrase} ${formatted}`;
    }
  );

  out = out.replace(SPACED_ISO_CURRENCY, (match, spacedCode: string, amount: string) => {
    const code = collapseSpacedCurrencyCode(spacedCode);
    if (!isValidCurrencyCode(code)) return match;
    return formatTtsCurrencyAmount(code, amount);
  });

  out = out.replace(
    COMPACT_CURRENCY_SPACED_AMOUNT,
    (match, code: string, amount: string) => {
      if (!isValidCurrencyCode(code)) return match;
      return formatTtsCurrencyAmount(code, amount);
    }
  );

  return out;
}

function normalizeSpacedAlphanumericIds(text: string): string {
  return text.replace(SPACED_ALPHANUMERIC_ID, (match) => {
    const compact = match.replace(/\s+/g, "");
    if (compact.length >= 20 && /^[a-z0-9]+$/i.test(compact)) {
      return compact.toLowerCase();
    }
    return match;
  });
}

function normalizeTtsMinusSeparators(text: string): string {
  let out = text;
  out = out.replace(/\b([A-Za-z0-9]+)\s*minus\s+(?=[A-Za-z0-9])/gi, "$1-");
  out = out.replace(/(\d)\s*minus\s+/gi, "$1-");
  out = out.replace(/(\d)minus(?=\s|[a-zA-Z0-9])/gi, "$1-");
  out = out.replace(
    /\bminus\s+(?=(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|[A-Za-z0-9])\b)/gi,
    "-"
  );
  return out;
}

export function extractOrderNumber(text: string): string | undefined {
  const denormalized = normalizeTtsOrderArtifacts(text);
  const compact = denormalized.replace(/\s+/g, "").toUpperCase();
  const glued = compact.replace(/^(ORD-\d{8}-[A-Z0-9]{6})\.\d{1,2}$/, "$1");
  const match = glued.match(/ORD-\d{8}-[A-Z0-9]{6}/);
  return match?.[0];
}

export function isValidStripeCheckoutUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "checkout.stripe.com" &&
      parsed.pathname.startsWith("/c/pay/cs_")
    );
  } catch {
    return false;
  }
}

export function normalizeOrderNumbersInText(text: string): string {
  let out = normalizeTtsOrderArtifacts(text);
  out = out.replace(/\s+/g, " ");

  out = out.replace(
    /(?:Your\s+)?order\s+number\s+is\s+([^.!?\n]+)/gi,
    (match, raw: string) => {
      const extracted = extractOrderNumber(raw);
      if (!extracted) return match;
      const prefix = /your\s+order\s+number\s+is/i.test(match)
        ? "Your order number is"
        : "Order number is";
      return `${prefix} ${extracted}`;
    }
  );

  out = out.replace(
    /(?<!Your\s)ORDER\s*NUMBER\s*IS\s*(ORD[\s-]*\d[\s\d-]*[\s-]*[A-Z0-9\s]+)/gi,
    (_, raw: string) => {
      const extracted = extractOrderNumber(raw);
      return extracted ? `Order number: ${extracted}` : raw;
    }
  );

  out = out.replace(/ORDERNUMBERIS(ORD[\dA-Z\s-]+)/gi, (_, raw: string) => {
    const extracted = extractOrderNumber(raw);
    return extracted ? `Order number: ${extracted}` : raw;
  });

  // Price cents glued with or without space: ORD-...-XXXXXX.00 or . 00
  out = out.replace(/ORD-\d{8}-[A-Z0-9]{6}\.\s*\d{1,2}\b/gi, (match) => {
    const extracted = extractOrderNumber(match.replace(/\s+/g, ""));
    return extracted ?? match.replace(/\.\s*\d{1,2}$/, "");
  });

  // Invalid suffix glued then cents: ORD-...-MCUSET. 00
  out = out.replace(/\bORD-\d{8}-[A-Z0-9]{7,}\.\s*\d{1,2}\b/gi, (match) => {
    const extracted = extractOrderNumber(match);
    return extracted ?? match.split(".")[0] ?? match;
  });

  out = out.replace(
    /Your checkout is ready!\s*-\s*Order number:\s*(ORD-\d{8}-[A-Z0-9]{6})/gi,
    (_, ord: string) =>
      `Checkout ready!\nOrder number: ${ord.toUpperCase()}`
  );

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
  return text.replace(/(\d[\d,]*)\.\s+(\d{1,2})\b/g, (_, whole: string, cents: string) => {
    const padded = cents.length === 1 ? `${cents}0` : cents;
    return `${whole.replace(/,/g, "")}.${padded}`;
  });
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

  out = normalizeTtsOrderArtifacts(out);
  out = normalizeOrderNumbersInText(out);
  out = normalizeCurrencySpacing(out);
  out = normalizeSpacedAlphanumericIds(out);
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
  if (/\b(?:[A-Za-z]\s+){2}[A-Za-z]\s+\d(?:\s+\d)+/.test(text)) return true;
  if (/\b[a-z0-9](?:\s+[a-z0-9]){8,}\b/i.test(text)) return true;

  return false;
}

function looksLikeSpelledOutOrder(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    /\bo\s+r\s+d\b/.test(normalized) ||
    /\bord\s+dash\b/.test(normalized) ||
    /\bord\s*minus\b/.test(normalized) ||
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
