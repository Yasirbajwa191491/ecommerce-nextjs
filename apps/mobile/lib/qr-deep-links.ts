/** Old receipt QRs and email links used /track-order/:orderNumber — map to a real Expo route. */
export function rewriteLegacyTrackOrderPath(path: string): string {
  const [pathname, query = ""] = path.split("?");
  const match = pathname.match(/\/track-order\/([^/?#]+)/);
  if (!match) return path;

  const orderNumber = decodeURIComponent(match[1] ?? "");
  const params = new URLSearchParams(query);
  params.set("orderNumber", orderNumber);
  params.set("source", "track");
  return `/order/${encodeURIComponent(orderNumber)}?${params.toString()}`;
}
