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
export function requiresHttpsSiteUrl(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.REQUIRE_HTTPS_SITE_URL === "1") return true;
  const deployment = env.CONVEX_DEPLOYMENT?.trim() ?? "";
  return deployment.startsWith("prod:");
}

/**
 * Canonical storefront origin for QR URLs, emails, and Stripe redirects.
 * Dev may fall back to localhost; production must set HTTPS SITE_URL.
 */
export function getSiteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env.SITE_URL?.trim();
  const enforceHttps = requiresHttpsSiteUrl(env);

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
