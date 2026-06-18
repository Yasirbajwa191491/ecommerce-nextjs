#!/usr/bin/env node
/**
 * Provisions or updates the Vapi "Store Shopping Assistant" with ecommerce tools.
 * Prompt and tools are loaded from convex/vapi/assistantConfig.ts (single source of truth).
 *
 * Usage:
 *   npm run vapi:setup
 *   npm run vapi:setup -- --prod
 *
 * Optional:
 *   VAPI_ASSISTANT_ID=...  (update existing assistant; dev)
 *   VAPI_PROD_ASSISTANT_ID=...  (update existing assistant; --prod)
 *   VAPI_WEBHOOK_SECRET=... (must match Convex env)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";

const IS_PROD = process.argv.includes("--prod");
const PRODUCTION_CONVEX_SITE_URL = "https://hip-salamander-864.convex.site";

function loadEnvLocal({ skipAssistantIds = false } = {}) {
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
    if (
      skipAssistantIds &&
      (key === "VAPI_ASSISTANT_ID" || key === "NEXT_PUBLIC_VAPI_ASSISTANT_ID")
    ) {
      continue;
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadAssistantConfig() {
  try {
    const output = execSync("npx --yes tsx scripts/export-vapi-config.ts", {
      encoding: "utf8",
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(output.trim());
  } catch (error) {
    console.error("Failed to load assistant config from convex/vapi/assistantConfig.ts");
    if (error instanceof Error && "stderr" in error) {
      console.error(String(error.stderr ?? error.message));
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

loadEnvLocal({ skipAssistantIds: IS_PROD });

const VAPI_API_KEY = process.env.VAPI_API_KEY?.trim();
const CONVEX_SITE_URL = IS_PROD
  ? process.env.CONVEX_SITE_URL?.trim() || PRODUCTION_CONVEX_SITE_URL
  : process.env.CONVEX_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
const EXISTING_ASSISTANT_ID = IS_PROD
  ? (
      process.env.VAPI_PROD_ASSISTANT_ID?.trim() ||
      process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim()
    )
  : process.env.VAPI_ASSISTANT_ID?.trim() ||
    process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim();
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET?.trim();

const { prompt: SYSTEM_PROMPT, tools: TOOLS } = loadAssistantConfig();

function withToolServer(tool, webhookUrl) {
  return {
    ...tool,
    async: false,
    server: { url: webhookUrl },
    messages: [
      {
        type: "request-start",
        content: "One moment while I check our store.",
        blocking: false,
      },
      {
        type: "request-failed",
        content:
          "I couldn't reach our store system right now. Let me try another way to help.",
      },
    ],
  };
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!VAPI_API_KEY) fail("VAPI_API_KEY is required");
if (!CONVEX_SITE_URL) {
  fail("CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL is required");
}

const webhookUrl = `${CONVEX_SITE_URL.replace(/\/$/, "")}/vapi/webhook`;
const TOOLS_WITH_SERVER = TOOLS.map((tool) => withToolServer(tool, webhookUrl));

const assistantPayload = {
  name: "Store Shopping Assistant",
  firstMessage:
    "Hi! I'm your shopping assistant. I can find products, explain promotions, add items to your cart, checkout, and track orders. What are you looking for today?",
  clientMessages: [
    "transcript",
    "tool-calls",
    "tool-calls-result",
    "conversation-update",
    "assistant.speechStarted",
    "status-update",
  ],
  serverMessages: ["tool-calls", "end-of-call-report", "transcript"],
  model: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.4,
    messages: [{ role: "system", content: SYSTEM_PROMPT }],
    tools: TOOLS_WITH_SERVER,
  },
  server: {
    url: webhookUrl,
    timeoutSeconds: 20,
    ...(WEBHOOK_SECRET
      ? { headers: { "x-vapi-secret": WEBHOOK_SECRET } }
      : {}),
  },
};

async function main() {
  const headers = {
    Authorization: `Bearer ${VAPI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const url = EXISTING_ASSISTANT_ID
    ? `https://api.vapi.ai/assistant/${EXISTING_ASSISTANT_ID}`
    : "https://api.vapi.ai/assistant";

  console.log(
    `Updating Vapi assistant (${IS_PROD ? "production" : "development"})…`
  );
  console.log(`Webhook: ${webhookUrl}`);
  console.log(`Tools:   ${TOOLS.length}`);
  if (EXISTING_ASSISTANT_ID) {
    console.log(`Assistant ID: ${EXISTING_ASSISTANT_ID}`);
  } else {
    console.log("No assistant ID set — creating a new assistant.");
  }

  const response = await fetch(url, {
    method: EXISTING_ASSISTANT_ID ? "PATCH" : "POST",
    headers,
    body: JSON.stringify(assistantPayload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Vapi API error:", data);
    process.exit(1);
  }

  const assistantId = data.id ?? EXISTING_ASSISTANT_ID;
  const target = IS_PROD ? "production" : "development";

  console.log(`\nStore Shopping Assistant provisioned successfully (${target}).\n`);
  console.log(`Assistant ID: ${assistantId}`);
  console.log(`Webhook URL:  ${webhookUrl}`);
  console.log(`Tools synced: ${TOOLS.length}`);
  console.log("\nIMPORTANT: Click Publish in Vapi dashboard if changes don't apply immediately.");

  if (IS_PROD) {
    console.log("\nAdd to Vercel Production env:");
    console.log(`NEXT_PUBLIC_VAPI_ASSISTANT_ID=${assistantId}`);
    console.log("NEXT_PUBLIC_CONVEX_URL=https://hip-salamander-864.convex.cloud");
    console.log("NEXT_PUBLIC_CONVEX_SITE_URL=https://hip-salamander-864.convex.site");
    console.log("\nOptional — store prod assistant id for future updates:");
    console.log(`VAPI_PROD_ASSISTANT_ID=${assistantId}`);
  } else {
    console.log("\nAdd to .env.local:");
    console.log(`NEXT_PUBLIC_VAPI_ASSISTANT_ID=${assistantId}`);
    console.log("\nSet on Convex (must match Vapi HTTP header x-vapi-secret):");
    console.log("npx convex env set VAPI_WEBHOOK_SECRET <your-secret>");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
