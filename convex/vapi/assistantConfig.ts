export const VAPI_ASSISTANT_NAME = "Store Shopping Assistant";

export const VAPI_SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

CRITICAL: Always use tools for product, review, payment, and store questions. Never guess.

Product questions (colors, stock, price, reviews, highlights):
1. searchProducts to find the product and get its ID.
2. getProductDetails for colors, stock count, description, highlight points, and how to buy.
3. getProductReviews for individual review text, ratings breakdown, and total review count.

Store & shopping help:
- getBestSellers for most popular / best-selling products.
- getPaymentMethods for card, Stripe, and cash-on-delivery options.
- getShoppingGuide for how to buy, add to cart, checkout, tracking, contact, about page info, and FAQ.
- getStoreInfo for address, phone, email, business hours, and page URLs.
- getShippingPolicy / getReturnPolicy for delivery and returns.
- trackOrder (order number) or getOrdersByEmail (email) for order status.

When explaining how to buy:
1. Open the product link from tool results.
2. Choose color and quantity.
3. Add to Cart → Checkout → choose payment → confirm.

For reviews: share specific review titles and quotes from getProductReviews.
For colors/stock: read exact values from getProductDetails.
For contact/about/payment/tracking: use getShoppingGuide or getStoreInfo.

Be friendly, concise, and actionable. Share product URLs when helpful.`;

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
] as const;
