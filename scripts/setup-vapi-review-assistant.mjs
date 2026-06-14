#!/usr/bin/env node
/**
 * Provisions or updates the Vapi "Product Review Collector" outbound assistant.
 *
 * Usage:
 *   VAPI_API_KEY=... CONVEX_SITE_URL=https://xxx.convex.site node scripts/setup-vapi-review-assistant.mjs
 *   node scripts/setup-vapi-review-assistant.mjs --prod
 *
 * Optional:
 *   VAPI_REVIEW_ASSISTANT_ID=...  (update existing assistant; dev)
 *   VAPI_PROD_REVIEW_ASSISTANT_ID=...  (update existing assistant; --prod)
 *   VAPI_WEBHOOK_SECRET=... (must match Convex env)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const IS_PROD = process.argv.includes("--prod");
const PRODUCTION_CONVEX_SITE_URL = "https://hip-salamander-864.convex.site";

function loadEnvLocal({ skipReviewAssistantId = false } = {}) {
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
    if (skipReviewAssistantId && key === "VAPI_REVIEW_ASSISTANT_ID") continue;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal({ skipReviewAssistantId: IS_PROD });

const VAPI_API_KEY = process.env.VAPI_API_KEY?.trim();
const CONVEX_SITE_URL = IS_PROD
  ? (process.env.CONVEX_SITE_URL?.trim() || PRODUCTION_CONVEX_SITE_URL)
  : (process.env.CONVEX_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim());
const EXISTING_ASSISTANT_ID = IS_PROD
  ? process.env.VAPI_PROD_REVIEW_ASSISTANT_ID?.trim()
  : process.env.VAPI_REVIEW_ASSISTANT_ID?.trim();
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET?.trim();

const SYSTEM_PROMPT = `You are a friendly ecommerce review collection assistant calling customers after successful delivery.

Your goals:
1. Greet the customer warmly and ask if they have a free moment before any review questions.
2. Only proceed with ratings and reviews if the customer clearly agrees.
3. If they decline or are busy, thank them sincerely and end the call politely — never pressure them.
4. Collect a star rating (1–5) and brief feedback for each product in their order.
5. Save each review immediately using the createProductReview tool.
6. Keep the entire call under 3 minutes.

IMPORTANT RULES:
- Always call getOrderProductsForReview first to see which products still need reviews.
- Never invent product names, prices, or order details — only use tool results.
- After each product rating and comment, call createProductReview before moving to the next product.
- Use the orderId and reviewCallId from call metadata in every tool call — never ask the customer for these.
- If the customer only wants to review some products, that's fine — skip the rest politely.
- After all reviews, optionally ask: "On a scale of 0 to 10, how likely would you be to recommend this product to a friend?" and pass the answer as recommendationScore.

CALL FLOW:
1. Warm greeting using the customer's name.
2. Ask permission: "Do you have a quick moment to share some feedback? It'll only take about a minute — and if now isn't a good time, that's completely fine."
3. If NO → thank them and end the call warmly.
4. If YES → call getOrderProductsForReview, then for each product:
   - "How would you rate your [Product Name] from 1 to 5 stars?"
   - "What did you like or dislike about it?"
   - Call createProductReview with the rating and their words.
5. Thank them for their time and wish them a great day.

Be conversational, patient, and kind. Speak naturally as on a friendly phone call.`;

function withToolServer(tool) {
  return {
    ...tool,
    async: false,
    server: { url: webhookUrl },
    messages: [
      {
        type: "request-start",
        content: "One moment while I save that for you.",
        blocking: false,
      },
      {
        type: "request-failed",
        content: "I'm having a little trouble saving that. Let me try again.",
      },
    ],
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "getOrderProductsForReview",
      description:
        "Get products from the customer's order that still need reviews. Call this after the customer agrees to leave feedback.",
      parameters: {
        type: "object",
        properties: {
          reviewCallId: { type: "string", description: "From call metadata" },
          orderId: { type: "string", description: "From call metadata" },
        },
        required: ["reviewCallId", "orderId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createProductReview",
      description:
        "Save a product review after collecting rating and feedback from the customer.",
      parameters: {
        type: "object",
        properties: {
          reviewCallId: { type: "string", description: "From call metadata" },
          orderId: { type: "string", description: "From call metadata" },
          productId: { type: "string" },
          rating: { type: "number", description: "1 to 5 stars" },
          review: { type: "string", description: "Customer's feedback in their own words" },
          recommendationScore: {
            type: "number",
            description: "Optional 0-10 recommendation score",
          },
        },
        required: ["reviewCallId", "orderId", "productId", "rating", "review"],
      },
    },
  },
];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

if (!VAPI_API_KEY) fail("VAPI_API_KEY is required");
if (!CONVEX_SITE_URL) fail("CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL is required");

const webhookUrl = `${CONVEX_SITE_URL.replace(/\/$/, "")}/vapi/webhook`;

const TOOLS_WITH_SERVER = TOOLS.map(withToolServer);

const assistantPayload = {
  name: "Product Review Collector",
  firstMessage:
    "Hi {{customerName}}! This is a friendly call from {{storeName}}. We hope your recent order arrived safely. Do you have a quick moment to share some feedback? It'll only take about a minute — and if now isn't a good time, that's completely fine.",
  clientMessages: ["transcript", "tool-calls", "status-update"],
  serverMessages: ["tool-calls", "end-of-call-report", "transcript", "status-update"],
  model: {
    provider: "google",
    model: "gemini-2.5-flash",
    temperature: 0.5,
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
  maxDurationSeconds: 180,
};

async function main() {
  const headers = {
    Authorization: `Bearer ${VAPI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const url = EXISTING_ASSISTANT_ID
    ? `https://api.vapi.ai/assistant/${EXISTING_ASSISTANT_ID}`
    : "https://api.vapi.ai/assistant";

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

  console.log(`\nProduct Review Collector assistant provisioned successfully (${target}).\n`);
  console.log(`Assistant ID: ${assistantId}`);
  console.log(`Webhook URL:  ${webhookUrl}`);
  console.log(`Tools added:  ${TOOLS.length}`);
  console.log("\nIMPORTANT: Click Publish in Vapi dashboard if changes don't apply immediately.");

  if (IS_PROD) {
    console.log("\nSet on Convex Production:");
    console.log(`npx convex env set VAPI_REVIEW_ASSISTANT_ID ${assistantId} --prod`);
    console.log("npx convex env set VAPI_PHONE_NUMBER_ID <phone-number-id> --prod");
    console.log("\nOptional — store prod review assistant id for future updates:");
    console.log(`VAPI_PROD_REVIEW_ASSISTANT_ID=${assistantId}`);
  } else {
    console.log("\nSet on Convex:");
    console.log(`npx convex env set VAPI_REVIEW_ASSISTANT_ID ${assistantId}`);
    console.log("npx convex env set VAPI_WEBHOOK_SECRET <your-secret>");
    console.log("npx convex env set VAPI_PHONE_NUMBER_ID <phone-number-id>");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
