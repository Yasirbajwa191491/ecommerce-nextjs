export function validateN8nSecret(request: Request): boolean {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = request.headers.get("X-N8N-Secret");
  return header === secret;
}

export function getConvexSiteUrl(): string {
  const siteUrl = process.env.CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!siteUrl) return "";
  return siteUrl.replace(/\/$/, "").replace(".convex.cloud", ".convex.site");
}
