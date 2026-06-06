#!/usr/bin/env node

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
