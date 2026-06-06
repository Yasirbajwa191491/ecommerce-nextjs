#!/usr/bin/env node
import { execSync } from "node:child_process";
import { resolveSiteUrl } from "./resolve-site-url.mjs";

const siteUrl = resolveSiteUrl();

console.log(`[sync-convex-site-url] VERCEL_ENV=${process.env.VERCEL_ENV ?? "local"}`);
console.log(`[sync-convex-site-url] SITE_URL=${siteUrl}`);

execSync(`npx convex env set SITE_URL "${siteUrl}"`, {
  stdio: "inherit",
  env: process.env,
});
