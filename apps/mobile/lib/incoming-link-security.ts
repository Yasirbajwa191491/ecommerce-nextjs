/** Bounds and validates the original URI before Expo Router/query-string sees it. */
export const MAX_INCOMING_LINK_LENGTH = 8192;
export function isSafeIncomingLink(raw: string, options: { siteUrl?: string; development?: boolean } = {}): boolean {
  if (!raw || raw.length > MAX_INCOMING_LINK_LENGTH || /[\u0000-\u0020\u007f\\]/.test(raw)) return false;
  // Do not repair malformed encoding: the legacy decoder's recovery paths are vulnerable.
  try { if (/[\u0000-\u001f\u007f\\]/.test(decodeURIComponent(raw))) return false; } catch { return false; }
  const query = raw.split("?", 2)[1]?.split("#", 1)[0] ?? "";
  const parameters = query.split("&");
  if (parameters.length > 64 || parameters.some(p => p.length > 2048)) return false;
  if (raw.startsWith("/")) return !raw.startsWith("//");
  try {
    const url = new URL(raw);
    if (url.username || url.password) return false;
    if (url.protocol === "ecommerce:") return !url.port;
    if (options.development && ["exp:", "exps:"].includes(url.protocol)) return true;
    return url.protocol === "https:" && Boolean(options.siteUrl) && url.origin === new URL(options.siteUrl!).origin;
  } catch { return false; }
}

export function incomingRoutePath(raw: string): string {
  if (raw.startsWith("/")) return raw.split(/[?#]/, 1)[0];
  const url = new URL(raw);
  return url.protocol === "ecommerce:" && url.hostname ? `/${url.hostname}${url.pathname}` : url.pathname;
}
export function isStripeReturnLink(raw: string): boolean {
  try { return ["/stripe-redirect", "/checkout/stripe-redirect"].includes(incomingRoutePath(raw)); } catch { return false; }
}
