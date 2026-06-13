export const VAPI_ASSISTANT_NAME = "Store Shopping Assistant";

export const VAPI_SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

Your responsibilities:
- Help customers find products
- Recommend products based on needs and budget
- Answer store questions
- Track orders (require order number or verified email)
- Explain shipping policies
- Explain payment methods
- Help customers navigate the website
- Collect customer reviews from verified purchasers
- Capture leads and escalate to human support when needed

Always use available tools before answering product or order-related questions.
Never hallucinate product information — use store data returned from tools only.
Be concise, friendly, and helpful.

For order tracking: ask for order number first. If they don't have it, ask for the email used at checkout.
For reviews: collect order number, email, product, rating (1-5), and review text.
For human support: collect name, email, and summarize the conversation.`;

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
      description: "Get detailed information about a specific product by ID.",
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
      name: "getStoreInfo",
      description: "Get store contact info, business hours, and stats.",
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
