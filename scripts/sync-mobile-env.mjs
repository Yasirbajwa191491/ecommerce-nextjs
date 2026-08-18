#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = resolve(rootDir, ".env.local");
const mobileEnvPath = resolve(rootDir, "apps/mobile/.env");

function readConvexUrl(sourcePath) {
  if (!existsSync(sourcePath)) return null;
  const content = readFileSync(sourcePath, "utf8");
  const match = content.match(/^NEXT_PUBLIC_CONVEX_URL=(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

const convexUrl = readConvexUrl(envLocalPath);

if (!convexUrl) {
  console.error(
    "[sync-mobile-env] NEXT_PUBLIC_CONVEX_URL not found in .env.local. Set it first, then re-run."
  );
  process.exit(1);
}

writeFileSync(
  mobileEnvPath,
  `# Auto-synced from root .env.local — do not commit\nEXPO_PUBLIC_CONVEX_URL=${convexUrl}\n`,
  "utf8"
);

console.log(`[sync-mobile-env] Wrote apps/mobile/.env with EXPO_PUBLIC_CONVEX_URL=${convexUrl}`);
