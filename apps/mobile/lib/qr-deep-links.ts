import { incomingRoutePath } from "./incoming-link-security";

/** Old receipt QRs and email links used /track-order/:orderNumber — map to a real Expo route. */
export function rewriteLegacyTrackOrderPath(path: string): string {
  const pathname = incomingRoutePath(path);
  const hashIndex = path.indexOf("#");
  const fragment = hashIndex < 0 ? "" : path.slice(hashIndex);
  const withoutFragment = hashIndex < 0 ? path : path.slice(0, hashIndex);
  const query = withoutFragment.split("?", 2)[1] ?? "";
  const match = pathname.match(/^\/track-order\/([^/?#]+)$/);
  if (!match) return path;

  const orderNumber = decodeURIComponent(match[1] ?? "");
  const params = new URLSearchParams(query);
  params.set("orderNumber", orderNumber);
  params.set("source", "track");
  return `/order/${encodeURIComponent(orderNumber)}?${params.toString()}${fragment}`;
}
