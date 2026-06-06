const DEFAULT_SITE_URL = "http://localhost:3000";

/**
 * Resolve the public site URL for dev, Vercel preview, or production.
 * Priority: SITE_URL → NEXT_PUBLIC_SITE_URL → Vercel production domain → VERCEL_URL → localhost.
 */
export function resolveSiteUrl(env = process.env) {
  const explicit = env.SITE_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit;

  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }

  if (env.VERCEL_URL?.trim()) {
    return `https://${env.VERCEL_URL.trim()}`;
  }

  return DEFAULT_SITE_URL;
}

/** Derive the Convex HTTP actions URL (.convex.site) from the cloud URL (.convex.cloud). */
export function resolveConvexSiteUrl(env = process.env) {
  const explicit = env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;

  const cloudUrl = env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!cloudUrl) return undefined;

  return cloudUrl.replace(/\.convex\.cloud\/?$/i, ".convex.site");
}
