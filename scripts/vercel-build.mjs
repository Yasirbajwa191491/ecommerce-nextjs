#!/usr/bin/env node
import { execSync } from "node:child_process";
import { resolveSiteUrl } from "./resolve-site-url.mjs";

if (!process.env.CONVEX_DEPLOY_KEY?.trim()) {
  console.error(
    "[vercel-build] Missing CONVEX_DEPLOY_KEY.\n" +
      "Add it in Vercel → Settings → Environment Variables:\n" +
      "  • Production deploy key → Production environment only\n" +
      "  • Preview deploy key → Preview environment only\n" +
      "Generate keys in the Convex dashboard → Project Settings → Deploy Keys."
  );
  process.exit(1);
}

const siteUrl = resolveSiteUrl();

console.log(`[vercel-build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}`);
console.log(`[vercel-build] VERCEL_URL=${process.env.VERCEL_URL ?? "(unset)"}`);
console.log(`[vercel-build] SITE_URL=${siteUrl}`);

const buildEnv = {
  ...process.env,
  SITE_URL: siteUrl,
  NEXT_PUBLIC_SITE_URL: siteUrl,
};

console.log("[vercel-build] Syncing SITE_URL to Convex...");
execSync(`npx convex env set SITE_URL "${siteUrl}"`, {
  stdio: "inherit",
  env: buildEnv,
});

console.log("[vercel-build] Deploying Convex and building Next.js...");
execSync(
  'npx convex deploy --cmd "next build" --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --preview-run "seed:seedAdminAndSettings"',
  { stdio: "inherit", env: buildEnv }
);

console.log("[vercel-build] Ensuring admin user and settings exist...");
execSync("npx convex run seed:seedAdminAndSettings", {
  stdio: "inherit",
  env: buildEnv,
});

console.log("[vercel-build] Done.");
