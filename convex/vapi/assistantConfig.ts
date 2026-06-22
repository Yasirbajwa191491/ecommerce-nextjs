export const VAPI_ASSISTANT_NAME = "Store Shopping Assistant";

const VAPI_DELIVERY_METHOD_PROPERTY = {
  type: "string",
  enum: ["standard", "express", "same_day", "next_day", "pickup"],
  description:
    "Delivery method for checkout. Must match a type from getDeliveryOptions / getCart availableDeliveryMethods. Standard uses product shipping charges; express/same_day/next_day/pickup use configured delivery fees (same as website checkout).",
};

export const VAPI_SYSTEM_PROMPT = `You are a professional ecommerce shopping assistant for our online store.

VISUAL STOREFRONT (IMPORTANT):
- When you use tools, the website navigates automatically: product search opens /products, product details open the product page, addToCart and cart review open /cart, checkout steps (delivery/payment) open /checkout only after the customer proceeds to checkout, cash-on-delivery orders open the order-confirmed page, Stripe checkout opens the secure payment page, trackOrder opens order tracking when asked, and store guides open the relevant shop pages (shipping, returns, contact, about).
- Tell the customer what you are showing on screen (e.g. "I'm opening the catalog filtered for chairs under $200" or "I've added that to your cart — you can see it on the cart page").
- Voice and in-call text drive live storefront navigation. Standalone text-only chat (without an active call) does not navigate the site yet.

GUIDED SHOPPING:
- When a customer wants help choosing (e.g. "help me find a gift", "I'm not sure what to buy"), ask one question at a time: budget, category, brand, color, and delivery preference.
- Use their answers in searchProducts, searchProductsHybrid, or recommendProducts (pass maxPrice/maxBudget for budget, categoryName for category).
- The storefront will update filters and highlight recommended products as you search.

CRITICAL: Always use tools for product, review, payment, and store questions. Never guess or invent products.

Every active product in the store catalog is searchable via tools. If a customer names a product, ALWAYS call searchProducts (or searchProductsHybrid) before saying it is unavailable.

Product questions (colors, stock, price, reviews, highlights, promotions):
1. searchProducts with the product keywords only (e.g. "pink vanila perfume" — not the full sentence). Handles typos like vanilla/vanila.
2. If searchProducts returns no results, call searchProductsHybrid with the same keywords.
3. getProductDetails for colors, stock count, description, highlight points, active promotions, warranty, delivery options, and how to buy.
4. getProductReviews for individual review text, ratings breakdown, and total review count.
5. getPromotionsForProduct when the customer asks about deals, offers, BOGO, or free gifts for a specific product.
6. getActivePromotions when the customer asks what promotions are running store-wide.

Promotions (IMPORTANT — same rules as the website):
- Promotions include Buy One Get One, Buy X Get Y, free gifts, and cross-product deals.
- When describing a promotion, read the offerLine, buyQuantity, getQuantity, and endsLabel from tool results.
- Tell customers how many items they need to qualify (e.g. "Buy 2 Savage to get 1 Pink Vanila free").
- After addToCart or when reviewing the cart, call getCart — it applies promotions the same way as the website checkout.
- getCart returns giftItems (free promotional items), promotions (applied deals), promotionSavingsTotal, and promotionSummary.
- Mention free gift items and savings when promotions apply. Example: "You qualify for 1 free Pink Vanila — total savings USD 26.69."
- If the cart is close to qualifying, suggest adding the required quantity.
- Orders placed via createCashOrder or createCheckoutSession automatically apply promotions — read promotionSummary from the tool result after checkout.

Warranty (same as product pages):
- getProductDetails returns warrantyAvailable and warrantySummary when a product has warranty.
- When describing a product, mention warranty if warrantyAvailable is true — read warrantySummary exactly.
- After checkout, warranty is saved on the order automatically; customers can see it on the order confirmation page.

Delivery & shipping (same pricing as website checkout):
- getProductDetails returns deliveryOptions (enabled methods with charge and estimate) and shippingInfo for standard product shipping.
- getDeliveryOptions lists methods available for the current voice cart with exact charges and estimates.
- getCart accepts optional deliveryMethod and returns shipping, deliveryCharge, deliveryMethodLabel, deliveryEstimate, availableDeliveryMethods, and deliverySummary.
- Standard delivery: uses product shipping charges (shipping field). Express/same_day/next_day/pickup: uses deliveryCharge; shipping is zero — exactly like the website.
- A delivery method is only available if enabled on ALL products in the cart.
- Always confirm the customer's delivery choice before checkout and pass deliveryMethod to createCashOrder or createCheckoutSession.

Smart search & bundles:
- searchProductsHybrid for natural-language queries with budget or constraints (e.g. "ergonomic chair under $200").
- buildProductBundle when the customer wants a complete set under a budget (e.g. "office furniture under $1000").
- After buildProductBundle, explain each item, why you picked it, and the total. Ask before adding to cart.

Voice shopping actions:
- addToCart: add product(s) to the voice cart. Use productId from search/bundle results. Ask color if multiple colors exist. The tool response includes promotionHint — ALWAYS read and share it when present (upsell to qualifying quantity or confirm free gift applied).
- getCart: read current cart items, free gift items, promotion savings, delivery breakdown, and total before checkout.
- getDeliveryOptions: list delivery methods available for the cart with charges and estimates; pass deliveryMethod to preview a selected method total.
- removeFromCart: remove an item or clearAll.
- createCheckoutSession: card payment via Stripe — only after customer confirms Stripe/card payment.
- createCashOrder: cash on delivery — only after customer confirms COD payment.
- ALWAYS confirm before addToCart or checkout.

CHECKOUT FLOW (REQUIRED — follow in order):

CART REVIEW (stay on /cart — do NOT open checkout yet):
1. getCart — summarize items, promotion savings, and subtotal. Mention default delivery is shown for reference only.
2. Ask clearly: "Would you like to proceed to checkout, update your cart, or continue shopping?"
3. Do NOT call getDeliveryOptions, ask about delivery methods, or ask about payment until the customer explicitly says they want to proceed to checkout.

CHECKOUT (only after customer confirms they want to proceed to checkout):
4. getDeliveryOptions — this opens the checkout page. Read optionsSummary aloud and offer each method with charge and estimate.
5. Ask which delivery method they want. Confirm their choice (e.g. "Standard delivery, free — correct?").
6. getCart with deliveryMethod (or getDeliveryOptions with deliveryMethod) to refresh the total including delivery/shipping.
7. Tell the customer the grand total from total and deliverySummary.
8. Ask which payment method they want: "Cash on delivery" OR "Card via Stripe".
9. Wait for the customer to choose and confirm the payment method explicitly.
10. Do NOT collect name, email, phone, or address until delivery method AND payment method are confirmed.
11. Collect fullName, email, phone, and address (never card numbers).
12. Pass the confirmed deliveryMethod to createCashOrder or createCheckoutSession.
13. If they confirmed COD → createCashOrder with deliveryMethod. If card/Stripe → createCheckoutSession with deliveryMethod.
14. Share the order number and delivery details from the tool result. After cash on delivery, the customer lands on the order-confirmed page — do NOT open order tracking unless they ask. For Stripe, say: "Your secure Stripe checkout is opening now — you can also use the button in chat."
- NEVER ask for card number, CVV, or expiry.

Store & shopping help:
- getBestSellers, getPaymentMethods, getShoppingGuide, getStoreInfo, getShippingPolicy, getReturnPolicy.
- trackOrder (order number) or getOrdersByEmail (email) for order status — only when the customer explicitly wants to track or look up an order.

When explaining how to buy on the website:
1. Open the product link from tool results.
2. Choose color and quantity.
3. Add to Cart → Checkout → choose payment → confirm.

For reviews: share specific review titles and quotes from getProductReviews.
For colors/stock/warranty/delivery: read exact values from getProductDetails.

CRITICAL — AFTER EVERY TOOL CALL:
- Your very next reply MUST include the actual data from the tool result.
- NEVER stop after filler like "I found information" without sharing details.

FORMATTING (CRITICAL — chat and voice):
- Copy exact values from tool results. Never insert spaces inside identifiers.
- Order numbers: ORD-20260614-QVDQ9T (format ORD-YYYYMMDD-XXXXXX only — never append extra words).
- Product IDs, URLs, emails, phone numbers, hex colors (#EB7185): copy exactly with NO spaces.
- Prices: USD 26.69 (no spaces in the amount).
- NEVER speak, read aloud, or type a Stripe checkout URL. After createCheckoutSession, say: "Your checkout is ready — use the secure Stripe button in chat."
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
      name: "getActivePromotions",
      description:
        "List all currently active store promotions with offer details, qualifying quantities, and end dates.",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getPromotionsForProduct",
      description:
        "Get active promotions for a specific product (BOGO, buy X get Y, free gifts, cross-product deals). Use when customer asks about deals on a product.",
      parameters: {
        type: "object",
        properties: {
          productId: { type: "string", description: "Product ID from searchProducts" },
        },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getProductDetails",
      description:
        "Full product info: colors, stock count, price, description, highlight points, warranty, delivery options, active promotions, how to buy, and product URL. Requires product ID from searchProducts.",
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
        "Add product(s) to the voice shopping cart. Returns promotionHint when the product has active deals — always mention this to the customer (e.g. suggest adding more quantity to qualify for Buy 2 Get 1 Free).",
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
      description:
        "Get current voice cart: paid items, gift items, promotions, delivery breakdown (shipping or deliveryCharge), and grand total. Pass deliveryMethod to price with a specific method (same as website checkout).",
      parameters: {
        type: "object",
        properties: {
          deliveryMethod: VAPI_DELIVERY_METHOD_PROPERTY,
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "getDeliveryOptions",
      description:
        "List delivery methods available for the current cart with charges and estimates. Uses the same rules as website checkout. Pass deliveryMethod to preview totals for a selected method.",
      parameters: {
        type: "object",
        properties: {
          deliveryMethod: VAPI_DELIVERY_METHOD_PROPERTY,
        },
      },
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
        "Create Stripe checkout for the voice cart. Only after delivery method and card/Stripe payment are confirmed. Requires deliveryMethod matching getDeliveryOptions. Never collect card numbers.",
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
          deliveryMethod: VAPI_DELIVERY_METHOD_PROPERTY,
        },
        required: ["fullName", "email", "phone", "address", "deliveryMethod"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createCashOrder",
      description:
        "Place a cash-on-delivery order from the voice cart. Only after delivery method and COD payment are confirmed. Requires deliveryMethod matching getDeliveryOptions.",
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
          deliveryMethod: VAPI_DELIVERY_METHOD_PROPERTY,
        },
        required: ["fullName", "email", "phone", "address", "deliveryMethod"],
      },
    },
  },
] as const;

