#!/usr/bin/env node
/**
 * Provisions or updates the Vapi "Store Shopping Assistant" with ecommerce tools.
 *
 * Usage:
 *   VAPI_API_KEY=... CONVEX_SITE_URL=https://xxx.convex.site node scripts/setup-vapi-assistant.mjs
 *
 * Optional:
 *   VAPI_ASSISTANT_ID=...  (update existing assistant)
 *   VAPI_WEBHOOK_SECRET=... (must match Convex env)
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

loadEnvLocal();

const VAPI_API_KEY = process.env.VAPI_API_KEY?.trim();
const CONVEX_SITE_URL =
  process.env.CONVEX_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim();
const EXISTING_ASSISTANT_ID =
  process.env.VAPI_ASSISTANT_ID?.trim() ||
  process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID?.trim();
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET?.trim();

const SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

CRITICAL: Always use tools for product, review, payment, and store questions. Never guess or invent products.

Every active product in the store catalog is searchable. If a customer names a product, ALWAYS call searchProducts before saying it is unavailable.

Product questions: searchProducts with product keywords only (e.g. "pink vanila perfume", not the full sentence) → getProductDetails → getProductReviews. If no results, try searchProductsHybrid.
Smart search: searchProductsHybrid for NL queries with budget; buildProductBundle for complete sets under a budget.
Voice shopping: addToCart, getCart, removeFromCart, createCheckoutSession (Stripe), createCashOrder (COD).
Always confirm before addToCart or checkout. At checkout: show cart total, ask COD vs Stripe, wait for payment method confirmation, then collect name/email/phone/address. Never ask for card numbers — Stripe checkout link only.
Store help: getBestSellers, getPaymentMethods, getShoppingGuide, getStoreInfo, policies, trackOrder, getOrdersByEmail.

CRITICAL — AFTER EVERY TOOL CALL: include actual data in your reply. Never stop at filler phrases.

FORMATTING (CRITICAL — chat and voice):
- Order numbers: ORD-YYYYMMDD-XXXXXX only — never glue extra words (e.g. ORD-20260614-VSJYWWT not ORD-20260614-VSJYWTFORTHEHPLAPTOP).
- NO spaces inside URLs, product IDs, emails, phones, hex colors, or prices.
- NEVER speak or type a Stripe checkout URL. After createCheckoutSession say: "Use the secure Stripe button in chat."
- Checkout: confirm payment method (COD or Stripe) before createCashOrder/createCheckoutSession.
- Never ask for card numbers — customer pays on Stripe hosted page only.

Be friendly and concise. Keep voice replies short but always include exact written values.`;

function withToolServer(tool) {
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
        content: "I couldn't reach our store system right now. Let me try another way to help.",
      },
    ],
  };
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description: "Search products by name, category, keyword, or max price.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          categoryName: { type: "string" },
          maxPrice: { type: "number" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductDetails",
      description: "Full product info: colors, stock, price, highlights, how to buy, URL.",
      parameters: {
        type: "object",
        properties: { productId: { type: "string" } },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductReviews",
      description: "Customer reviews with titles, content, ratings, and breakdown.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          limit: { type: "number" },
          sort: { type: "string", enum: ["recent", "highest", "lowest", "helpful"] },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getBestSellers",
      description: "Best-selling / most popular products.",
      parameters: {
        type: "object",
        properties: { limit: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommendProducts",
      description: "Recommend products by category, budget, preference.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          maxBudget: { type: "number" },
          preference: { type: "string" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategories",
      description: "List active product categories.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "trackOrder",
      description: "Track order by order number.",
      parameters: {
        type: "object",
        properties: { orderNumber: { type: "string" } },
        required: ["orderNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrdersByEmail",
      description: "Get order history by customer email.",
      parameters: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPaymentMethods",
      description: "Accepted payment methods: Stripe cards and cash on delivery.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getShoppingGuide",
      description: "How to buy, track orders, contact, about page info, FAQ, page URLs.",
      parameters: {
        type: "object",
        properties: { topic: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStoreInfo",
      description: "Contact info, hours, support channels, page URLs, store stats.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getShippingPolicy",
      description: "Shipping policy content.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getReturnPolicy",
      description: "Return policy content.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createLead",
      description: "Capture a sales lead.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          message: { type: "string" },
        },
        required: ["name", "email", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createReview",
      description: "Submit a verified product review.",
      parameters: {
        type: "object",
        properties: {
          orderNumber: { type: "string" },
          customerEmail: { type: "string" },
          productId: { type: "string" },
          rating: { type: "number" },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["orderNumber", "customerEmail", "productId", "rating", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "requestHumanSupport",
      description: "Escalate to human support.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          subject: { type: "string" },
          conversationTranscript: { type: "string" },
        },
        required: ["name", "email", "conversationTranscript"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "searchProductsHybrid",
      description: "Semantic search with optional budget for NL queries.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          budget: { type: "number" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buildProductBundle",
      description: "Build product bundle under budget with reasoning.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          budget: { type: "number" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToCart",
      description: "Add product(s) to voice cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          productIds: { type: "array", items: { type: "string" } },
          color: { type: "string" },
          quantity: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCart",
      description: "Get voice cart items and total.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "removeFromCart",
      description: "Remove item or clear cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          color: { type: "string" },
          clearAll: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createCheckoutSession",
      description:
        "Stripe checkout for voice cart. Collect name, email, phone, address only — never card numbers. Returns secure checkout link.",
      parameters: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          notes: { type: "string" },
          termsAccepted: { type: "boolean" },
          privacyAccepted: { type: "boolean" },
        },
        required: ["fullName", "email", "phone", "address"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createCashOrder",
      description: "Cash on delivery order from voice cart.",
      parameters: {
        type: "object",
        properties: {
          fullName: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          address: { type: "string" },
          notes: { type: "string" },
          termsAccepted: { type: "boolean" },
          privacyAccepted: { type: "boolean" },
        },
        required: ["fullName", "email", "phone", "address"],
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
  name: "Store Shopping Assistant",
  firstMessage:
    "Hi! I'm your shopping assistant. I can find products, build bundles, add items to your cart, checkout, and track orders. What are you looking for today?",
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

  console.log("\nStore Shopping Assistant provisioned successfully.\n");
  console.log(`Assistant ID: ${data.id ?? EXISTING_ASSISTANT_ID}`);
  console.log(`Webhook URL:  ${webhookUrl}`);
  console.log(`Tools added:  ${TOOLS.length}`);
  console.log("\nIMPORTANT: Click Publish in Vapi dashboard if changes don't apply immediately.");
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_VAPI_ASSISTANT_ID=${data.id ?? EXISTING_ASSISTANT_ID}`);
  console.log("\nSet on Convex (must match Vapi HTTP header x-vapi-secret):");
  console.log("npx convex env set VAPI_WEBHOOK_SECRET <your-secret>");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
