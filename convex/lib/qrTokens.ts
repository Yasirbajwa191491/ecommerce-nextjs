import { getSiteUrl } from "./siteUrl";
import type { QrType } from "./qrValidators";
import { QR_TYPES } from "./qrValidators";

const TOKEN_BYTES = 32;
const BASE64URL_RE = /^[A-Za-z0-9_-]{32,128}$/;

export function generateQrToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToBase64Url(bytes);
}

export async function hashQrToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token.trim());
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

export function buildQrPath(type: QrType, token: string): string {
  return `/qr/${type}/${encodeURIComponent(token)}`;
}

export function buildQrUrl(type: QrType, token: string, siteUrl = getSiteUrl()): string {
  const origin = siteUrl.replace(/\/$/, "");
  return `${origin}${buildQrPath(type, token)}`;
}

export function isQrType(value: string): value is QrType {
  return (QR_TYPES as readonly string[]).includes(value);
}

export type ParsedQrPayload = {
  type: QrType;
  token: string;
};

/**
 * Extracts type + token from an HTTPS QR URL, custom-scheme deep link, or raw token.
 * Does not treat order numbers as tokens.
 */
export function parseQrPayload(raw: string): ParsedQrPayload | null {
  const value = raw.trim();
  if (!value) return null;

  const fromUrl = parseQrUrl(value);
  if (fromUrl) return fromUrl;

  if (BASE64URL_RE.test(value) && !value.startsWith("ORD-")) {
    return null;
  }

  return null;
}

export function parseQrUrl(raw: string): ParsedQrPayload | null {
  const value = raw.trim();
  if (!value) return null;

  const pathMatch = value.match(
    /(?:^|[\/])qr\/(product|order|package|payment|delivery)\/([^/?#]+)/i
  );
  if (!pathMatch) return null;

  const type = pathMatch[1]?.toLowerCase();
  const token = safeDecode(pathMatch[2] ?? "");
  if (!type || !isQrType(type) || !isQrTokenShape(token)) {
    return null;
  }
  return { type, token };
}

export function isQrTokenShape(token: string): boolean {
  return BASE64URL_RE.test(token.trim());
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let binary = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triplet = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    binary += alphabet[(triplet >> 18) & 63];
    binary += alphabet[(triplet >> 12) & 63];
    binary += b === undefined ? "=" : alphabet[(triplet >> 6) & 63];
    binary += c === undefined ? "=" : alphabet[triplet & 63];
  }
  return binary.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
