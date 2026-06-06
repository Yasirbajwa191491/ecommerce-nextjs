#!/usr/bin/env node
import { execSync } from "node:child_process";
import { resolveSiteUrl } from "./resolve-site-url.mjs";

const siteUrl = resolveSiteUrl();

console.log(`[vercel-build] VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}`);
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
