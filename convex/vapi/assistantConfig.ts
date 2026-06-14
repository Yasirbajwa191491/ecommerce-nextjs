export const VAPI_ASSISTANT_NAME = "Store Shopping Assistant";

export const VAPI_SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

CRITICAL: Always use tools for product, review, payment, and store questions. Never guess or invent products.

Every active product in the store catalog is searchable via tools. If a customer names a product, ALWAYS call searchProducts (or searchProductsHybrid) before saying it is unavailable.

Product questions (colors, stock, price, reviews, highlights):
1. searchProducts with the product keywords only (e.g. "pink vanila perfume" — not the full sentence). Handles typos like vanilla/vanila.
2. If searchProducts returns no results, call searchProductsHybrid with the same keywords.
3. getProductDetails for colors, stock count, description, highlight points, and how to buy.
4. getProductReviews for individual review text, ratings breakdown, and total review count.

Smart search & bundles:
- searchProductsHybrid for natural-language queries with budget or constraints (e.g. "ergonomic chair under $200").
- buildProductBundle when the customer wants a complete set under a budget (e.g. "office furniture under $1000").
- After buildProductBundle, explain each item, why you picked it, and the total. Ask before adding to cart.

Voice shopping actions:
- addToCart: add product(s) to the voice cart. Use productId from search/bundle results. Ask color if multiple colors exist.
- getCart: read current cart items and total before checkout.
- removeFromCart: remove an item or clearAll.
- createCheckoutSession: card payment via Stripe — only after customer confirms Stripe/card payment.
- createCashOrder: cash on delivery — only after customer confirms COD payment.
- ALWAYS confirm before addToCart or checkout.

CHECKOUT FLOW (REQUIRED — follow in order):
1. getCart and tell the customer the cart total.
2. Ask which payment method they want: "Cash on delivery" OR "Card via Stripe".
3. Wait for the customer to choose and confirm the payment method explicitly. Example: "You chose card via Stripe — I'll collect your shipping details next. Correct?"
4. Do NOT collect name, email, phone, or address until payment method is confirmed.
5. Collect fullName, email, phone, and address (never card numbers).
6. If they confirmed COD → createCashOrder. If they confirmed card/Stripe → createCheckoutSession.
7. Share the exact order number and checkout link from the tool result (Stripe link only for card payments).
- NEVER ask for card number, CVV, or expiry. Say: "Enter your card on the secure Stripe checkout page — I'll share the link in chat."

Store & shopping help:
- getBestSellers, getPaymentMethods, getShoppingGuide, getStoreInfo, getShippingPolicy, getReturnPolicy.
- trackOrder (order number) or getOrdersByEmail (email) for order status.

When explaining how to buy on the website:
1. Open the product link from tool results.
2. Choose color and quantity.
3. Add to Cart → Checkout → choose payment → confirm.

For reviews: share specific review titles and quotes from getProductReviews.
For colors/stock: read exact values from getProductDetails.

CRITICAL — AFTER EVERY TOOL CALL:
- Your very next reply MUST include the actual data from the tool result.
- NEVER stop after filler like "I found information" without sharing details.

FORMATTING (CRITICAL — chat and voice):
- Copy exact values from tool results. Never insert spaces inside identifiers.
- Order numbers: ORD-20260614-QVDQ9T (no spaces).
- Product IDs, URLs, emails, phone numbers, hex colors (#EB7185): copy exactly with NO spaces.
- Prices: USD 26.69 (no spaces in the amount).
- In chat, product and checkout details come from tool results — use those exact strings.

Be friendly and concise. Keep voice replies short but always include exact written values.`;

export const VAPI_TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "searchProducts",
      description:
        "Search products by name, category, keyword, or max price. Use for product discovery.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keywords" },
          categoryName: { type: "string", description: "Category name filter" },
          maxPrice: { type: "number", description: "Maximum price filter" },
          limit: { type: "number", description: "Max results (default 8)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductDetails",
      description:
        "Full product info: colors, stock count, price, description, highlight points, how to buy, and product URL. Requires product ID from searchProducts.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductReviews",
      description:
        "Get approved customer reviews for a product including each review title, content, rating, helpful count, and rating breakdown.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          limit: { type: "number" },
          sort: {
            type: "string",
            enum: ["recent", "highest", "lowest", "helpful"],
          },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getBestSellers",
      description: "Get best-selling / most popular products in the store.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "recommendProducts",
      description: "Recommend products by category, budget, and preferences.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string" },
          maxBudget: { type: "number" },
          preference: { type: "string", description: "e.g. comfort, ergonomics, design" },
          limit: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCategories",
      description: "List all active product categories.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "trackOrder",
      description: "Track an order by order number.",
      parameters: {
        type: "object",
        properties: {
          orderNumber: { type: "string" },
        },
        required: ["orderNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getOrdersByEmail",
      description: "Look up customer order history by email address.",
      parameters: {
        type: "object",
        properties: {
          email: { type: "string" },
        },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPaymentMethods",
      description:
        "List accepted payment methods: credit/debit cards via Stripe and cash on delivery.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getShoppingGuide",
      description:
        "Store guide: how to buy, add to cart, checkout, track orders, contact support, about page info, FAQ, and page URLs.",
      parameters: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            description: "Optional topic e.g. payment, tracking, contact, about",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getStoreInfo",
      description:
        "Store contact info, business hours, support channels, page URLs, and stats.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getShippingPolicy",
      description: "Get shipping policy information.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "getReturnPolicy",
      description: "Get return and refund policy information.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "createLead",
      description: "Capture a sales lead with contact details.",
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
      description: "Escalate to human support with conversation context.",
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
      description:
        "Semantic product search for natural-language queries with optional budget. Use for complex requests like 'office chair under $200'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Natural language search query" },
          budget: { type: "number", description: "Maximum price budget" },
          limit: { type: "number", description: "Max results (default 8)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buildProductBundle",
      description:
        "Build an optimized product bundle under a budget with reasoning for each item. Use for requests like 'office furniture under $1000'.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What the customer needs" },
          budget: { type: "number", description: "Total budget in dollars" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "addToCart",
      description:
        "Add product(s) to the voice shopping cart. Pass productId for one item or productIds array for a bundle.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Single product ID" },
          productIds: {
            type: "array",
            items: { type: "string" },
            description: "Multiple product IDs from a bundle",
          },
          color: { type: "string", description: "Product color if applicable" },
          quantity: { type: "number", description: "Quantity (default 1)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getCart",
      description: "Get current voice cart items, subtotal, and total.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "removeFromCart",
      description: "Remove a product from cart or clear the entire cart.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string" },
          color: { type: "string" },
          clearAll: { type: "boolean", description: "Set true to empty the cart" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createCheckoutSession",
      description:
        "Create Stripe checkout for the voice cart. Only call after the customer explicitly confirmed card/Stripe payment. Collect fullName, email, phone, address only — never card numbers. Returns orderNumber and checkoutUrl for the secure Stripe page.",
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
      description:
        "Place a cash-on-delivery order from the voice cart. Only call after the customer explicitly confirmed COD payment. Requires fullName, email, phone, address.",
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
] as const;

