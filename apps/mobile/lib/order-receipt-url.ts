/** Public track-order URL encoded in receipt QR codes. */
export function buildReceiptTrackUrl(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (siteUrl) {
    return `${siteUrl}/track-order/${encodeURIComponent(trimmed)}`;
  }
  return `ecommerce://order/${encodeURIComponent(trimmed)}?orderNumber=${encodeURIComponent(trimmed)}`;
}
