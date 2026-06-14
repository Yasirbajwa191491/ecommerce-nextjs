#!/usr/bin/env node
/**
 * Provision Vapi shopping + review assistants for Convex production (hip-salamander-864).
 *
 * Usage:
 *   VAPI_WEBHOOK_SECRET=whsec_... npm run vapi:setup:prod
 *
 * Optional:
 *   VAPI_PROD_ASSISTANT_ID=...         (patch existing shopping assistant)
 *   VAPI_PROD_REVIEW_ASSISTANT_ID=...    (patch existing review assistant)
 *   SKIP_CONVEX_ENV=1                  (skip syncing secrets to Convex prod)
 */

import { execSync, spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PRODUCTION_CONVEX_SITE_URL = "https://hip-salamander-864.convex.site";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function setConvexProdEnv(key, value) {
  console.log(`\n→ Convex prod env: ${key}`);
  try {
    const output = execSync(`npx convex env set ${key} ${JSON.stringify(value)} --prod`, {
      encoding: "utf8",
      env: process.env,
    });
    process.stdout.write(output);
    if (output.includes("doting-bat-377") || output.includes("dev deployment")) {
      console.warn(
        `\n⚠ Warning: Convex CLI applied ${key} to DEV (doting-bat-377), not production (hip-salamander-864).` +
          "\n  Your .env.local CONVEX_DEPLOY_KEY overrides --prod." +
          "\n  Set this var manually in Convex Dashboard → Production (hip-salamander-864) → Environment Variables."
      );
      return false;
    }
    return true;
  } catch {
    fail(`Failed to set Convex production env var ${key}. Run: npx convex login`);
  }
}

function runSetup(scriptName) {
  console.log(`\n=== Running ${scriptName} ===\n`);
  const result = spawnSync("node", [`scripts/${scriptName}`, "--prod"], {
    stdio: "inherit",
    env: {
      ...process.env,
      CONVEX_SITE_URL: PRODUCTION_CONVEX_SITE_URL,
    },
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

loadEnvLocal();

const webhookSecret = process.env.VAPI_WEBHOOK_SECRET?.trim();
const vapiApiKey = process.env.VAPI_API_KEY?.trim();

if (!vapiApiKey) {
  fail("VAPI_API_KEY is required (set in .env.local or environment)");
}
if (!webhookSecret) {
  fail(
    "VAPI_WEBHOOK_SECRET is required.\n" +
      "Example: VAPI_WEBHOOK_SECRET=whsec_... npm run vapi:setup:prod"
  );
}

console.log("Vapi production setup");
console.log(`Convex site: ${PRODUCTION_CONVEX_SITE_URL}`);
console.log(`Webhook:     ${PRODUCTION_CONVEX_SITE_URL}/vapi/webhook`);

if (!process.env.SKIP_CONVEX_ENV) {
  const synced = [
    setConvexProdEnv("VAPI_WEBHOOK_SECRET", webhookSecret),
    setConvexProdEnv("VAPI_API_KEY", vapiApiKey),
  ];
  if (synced.some((ok) => !ok)) {
    console.log("\n--- Convex Production env (set manually in dashboard) ---");
    console.log(`VAPI_WEBHOOK_SECRET=${webhookSecret}`);
    console.log(`VAPI_API_KEY=${vapiApiKey}`);
    console.log("Deployment: hip-salamander-864 (Production)");
  }
}

runSetup("setup-vapi-assistant.mjs");
runSetup("setup-vapi-review-assistant.mjs");

console.log("\n✓ Production Vapi setup complete.");
console.log("\nNext steps:");
console.log("1. Publish both assistants in the Vapi dashboard.");
console.log("2. Set Vercel Production env vars (see output above).");
console.log("3. Deploy Convex to production if not already: npx convex deploy");
