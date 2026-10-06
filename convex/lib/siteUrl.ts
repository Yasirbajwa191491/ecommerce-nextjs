const DEFAULT_SITE_URL = "http://localhost:3000";

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Production Convex deployments use `prod:` deployment names.
 * Set REQUIRE_HTTPS_SITE_URL=1 to enforce the same rules on preview/staging.
 */
export type SiteUrlEnv = {
  SITE_URL?: string;
  CONVEX_DEPLOYMENT?: string;
  REQUIRE_HTTPS_SITE_URL?: string;
};

function resolveSiteUrlEnv(env?: SiteUrlEnv): SiteUrlEnv {
  if (env) return env;
  return {
    SITE_URL: process.env.SITE_URL,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    REQUIRE_HTTPS_SITE_URL: process.env.REQUIRE_HTTPS_SITE_URL,
  };
}

export function requiresHttpsSiteUrl(env?: SiteUrlEnv): boolean {
  const resolved = resolveSiteUrlEnv(env);
  if (resolved.REQUIRE_HTTPS_SITE_URL === "1") return true;
  const deployment = resolved.CONVEX_DEPLOYMENT?.trim() ?? "";
  return deployment.startsWith("prod:");
}

/**
 * Canonical storefront origin for QR URLs, emails, and Stripe redirects.
 * Dev may fall back to localhost; production must set HTTPS SITE_URL.
 */
export function getSiteUrl(env?: SiteUrlEnv): string {
  const resolved = resolveSiteUrlEnv(env);
  const raw = resolved.SITE_URL?.trim();
  const enforceHttps = requiresHttpsSiteUrl(resolved);

  if (enforceHttps) {
    if (!raw) {
      throw new Error(
        "SITE_URL must be set to your public HTTPS storefront URL on this Convex deployment."
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`SITE_URL is not a valid URL: ${raw}`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error(
        `SITE_URL must use HTTPS on production deployments (got ${raw}).`
      );
    }
    if (isLocalhostUrl(raw)) {
      throw new Error(
        "SITE_URL must not be localhost on production Convex deployments."
      );
    }
    return raw;
  }

  return raw || DEFAULT_SITE_URL;
}
