const DEFAULT_SITE_URL = "http://localhost:3000";

/** Public site URL for metadata, links, and build-time env injection. */
export function resolveSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
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

/** Convex HTTP actions URL (.convex.site) from cloud URL (.convex.cloud). */
export function resolveConvexSiteUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const explicit = env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
  if (explicit) return explicit;

  const cloudUrl = env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!cloudUrl) return undefined;

  return cloudUrl.replace(/\.convex\.cloud\/?$/i, ".convex.site");
}
