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

const VAPI_API_KEY = process.env.VAPI_API_KEY?.trim();
const CONVEX_SITE_URL =
  process.env.NEXT_PUBLIC_CONVEX_SITE_URL?.trim() ||
  process.env.CONVEX_SITE_URL?.trim();
const EXISTING_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID?.trim();
const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET?.trim();

const SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

CRITICAL: Always use tools for product, review, payment, and store questions. Never guess.

Product questions (colors, stock, price, reviews, highlights):
1. searchProducts to find the product and get its ID.
2. getProductDetails for colors, stock count, description, highlight points, and how to buy.
3. getProductReviews for individual review text, ratings breakdown, and total review count.

Store & shopping help:
- getBestSellers for most popular products.
- getPaymentMethods for card, Stripe, and cash-on-delivery.
- getShoppingGuide for how to buy, add to cart, checkout, tracking, contact, about page, FAQ.
- getStoreInfo for address, phone, email, business hours, page URLs.
- getShippingPolicy / getReturnPolicy for delivery and returns.
- trackOrder or getOrdersByEmail for order status.

When explaining how to buy: product link → choose color → Add to Cart → Checkout → payment → confirm.
For reviews: use getProductReviews. For colors/stock: use getProductDetails.
Be friendly, concise, and share product URLs when helpful.`;

if (!VAPI_API_KEY) fail("VAPI_API_KEY is required");
if (!CONVEX_SITE_URL) fail("CONVEX_SITE_URL or NEXT_PUBLIC_CONVEX_SITE_URL is required");

function withToolServer(tool) {
  return {
    ...tool,
    async: false,
    server: { url: webhookUrl },
    messages: [
      {
        type: "request-start",
        content: "Let me check our store for that, one moment.",
      },
      {
        type: "request-complete",
        content: "I found some information for you.",
      },
      {
        type: "request-failed",
        content: "I couldn't reach our store system. Let me try another way to help.",
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
    "Hi! I'm your shopping assistant. I can search products, track orders, and answer shipping or return questions. What are you looking for today?",
  clientMessages: ["transcript", "tool-calls", "status-update"],
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
