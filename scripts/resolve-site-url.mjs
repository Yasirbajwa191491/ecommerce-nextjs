const DEFAULT_SITE_URL = "http://localhost:3000";
const LOCALHOST_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i;

function isLocalhostUrl(url) {
  return LOCALHOST_URL.test(url);
}

/**
 * Resolve the public site URL for dev, Vercel preview, or production.
 * On Vercel, localhost values in SITE_URL are ignored so .env.example values do not leak.
 */
export function resolveSiteUrl(env = process.env) {
  const explicit = env.SITE_URL?.trim() || env.NEXT_PUBLIC_SITE_URL?.trim();
  const onVercel = env.VERCEL === "1" || Boolean(env.VERCEL_ENV);

  if (explicit && (!onVercel || !isLocalhostUrl(explicit))) {
    return explicit;
  }

  if (env.VERCEL_ENV === "production" && env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  }

  if (env.VERCEL_URL?.trim()) {
    return `https://${env.VERCEL_URL.trim()}`;
  }

  if (explicit) return explicit;

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
