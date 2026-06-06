#!/usr/bin/env node
import { execSync } from "node:child_process";

/** Validate CONVEX_DEPLOY_KEY and exit with actionable errors. Returns the trimmed key. */
export function requireConvexDeployKey(env = process.env) {
  const key = env.CONVEX_DEPLOY_KEY?.trim();

  if (!key) {
    console.error(
      "[vercel-build] Missing CONVEX_DEPLOY_KEY.\n\n" +
        "1. Open Convex dashboard → your project → Production deployment\n" +
        "2. Settings → Generate Production Deploy Key → copy the full key\n" +
        "3. Vercel → Settings → Environment Variables → add CONVEX_DEPLOY_KEY\n" +
        "   • Paste the production key\n" +
        "   • Enable Production only (use a separate Preview key for Preview)\n\n" +
        "Do NOT use the dev key from .env.local (dev:...) on Vercel Production."
    );
    process.exit(1);
  }

  if (key.startsWith("dev:")) {
    console.error(
      "[vercel-build] CONVEX_DEPLOY_KEY is a dev key (starts with \"dev:\").\n\n" +
        "Vercel Production needs a Production deploy key from the Convex dashboard.\n" +
        "Dev keys only work with `npx convex dev` on your machine.\n\n" +
        "Generate one at: Convex dashboard → Production deployment → Settings → Deploy Keys"
    );
    process.exit(1);
  }

  if (!key.includes("|")) {
    console.error(
      "[vercel-build] CONVEX_DEPLOY_KEY looks incomplete (expected format: prod:slug|eyJ...).\n\n" +
        "Copy the entire key from the Convex dashboard, including the part after |."
    );
    process.exit(1);
  }

  return key;
}

/** Remove local-dev Convex vars so CI uses CONVEX_DEPLOY_KEY only. */
export function convexBuildEnv(env = process.env) {
  const buildEnv = { ...env };
  delete buildEnv.CONVEX_DEPLOYMENT;
  delete buildEnv.NEXT_PUBLIC_CONVEX_URL;
  delete buildEnv.NEXT_PUBLIC_CONVEX_SITE_URL;
  return buildEnv;
}

/**
 * Sync SITE_URL to Convex. Best-effort — some deploy keys cannot write env vars (403).
 * Returns true when synced, false when skipped (build should continue either way).
 */
export function trySyncConvexSiteUrl(siteUrl, env = process.env) {
  const buildEnv = { ...convexBuildEnv(env), SITE_URL: siteUrl };

  console.log("[vercel-build] Syncing SITE_URL to Convex...");
  try {
    execSync(`npx convex env set SITE_URL "${siteUrl}"`, {
      stdio: "pipe",
      encoding: "utf8",
      env: buildEnv,
    });
    console.log("[vercel-build] Convex SITE_URL updated.");
    return true;
  } catch (error) {
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    const lacksPermission =
      output.includes("WriteEnvironmentVariables") || output.includes("403 Forbidden");

    if (lacksPermission) {
      console.warn(
        "[vercel-build] Deploy key cannot write Convex env vars (403). Skipping SITE_URL sync.\n" +
          "Set SITE_URL manually in Convex dashboard → Production → Settings → Environment Variables.\n" +
          `Expected value: ${siteUrl}`
      );
      return false;
    }

    console.error(output || error.message);
    throw error;
  }
}
