import type { CopilotIntent } from "./copilotTypes";

type IntentRule = {
  intent: CopilotIntent;
  patterns: RegExp[];
};

const INTENT_RULES: IntentRule[] = [
  {
    intent: "overview",
    patterns: [
      /what happened/,
      /business (update|summary|overview)/,
      /how (is|are) (things|business|store)/,
      /this week/,
      /this month/,
      /business risks?/,
      /biggest opportunities?/,
      /aware of/,
    ],
  },
  {
    intent: "revenue",
    patterns: [
      /revenue/,
      /sales performance/,
      /best sales day/,
      /compare.*month/,
      /how much (did we|have we) (sell|made|earn)/,
      /forecast/,
      /next month/,
      /project(ed)?/,
    ],
  },
  {
    intent: "sales_trends",
    patterns: [
      /sales trend/,
      /order trend/,
      /growth trend/,
      /momentum/,
      /growing fastest/,
      /losing momentum/,
      /forecast/,
    ],
  },
  {
    intent: "trending_products",
    patterns: [
      /trending/,
      /gaining (momentum|sales)/,
      /hot products/,
      /best sellers?/,
      /most selling/,
      /top selling/,
      /best selling/,
      /top products?/,
      /selling product/,
      /which product/,
      /what product/,
      /highest sales/,
      /most (sold|popular)/,
      /growing fastest/,
    ],
  },
  {
    intent: "low_performing_products",
    patterns: [
      /losing sales/,
      /declining/,
      /underperform/,
      /low performing/,
      /slowing down/,
      /losing momentum/,
      /declining products?/,
    ],
  },
  {
    intent: "promotion_recommendations",
    patterns: [
      /what should i promote/,
      /promote/,
      /promotion/,
      /marketing focus/,
      /what to feature/,
      /deserve promotion/,
      /should (receive|get) additional discounts?/,
      /should not be promoted/,
      /already sell well/,
    ],
  },
  {
    intent: "inventory",
    patterns: [
      /restock/,
      /reorder/,
      /inventory/,
      /stock(out)?/,
      /stocks?/,
      /low stock/,
      /high stock/,
      /highest stocks?/,
      /most stocks?/,
      /top stocks?/,
      /overstock/,
      /stock level/,
      /need restocking/,
      /how much (stock|inventory)/,
      /run out of stock/,
      /run out soon/,
      /30 days?/,
      /inventory risks?/,
      /forecast inventory/,
      /excess inventory/,
    ],
  },
  {
    intent: "products",
    patterns: [
      /catalog/,
      /all products/,
      /product list/,
      /how many products/,
      /featured products?/,
      /product count/,
      /which products?/,
      /what products?/,
    ],
  },
  {
    intent: "orders",
    patterns: [
      /\borders?\b/,
      /pending orders?/,
      /shipped/,
      /delivered/,
      /cancelled orders?/,
      /refund/,
      /payment status/,
      /recent orders?/,
      /order status/,
      /how many orders/,
    ],
  },
  {
    intent: "reviews",
    patterns: [
      /review/,
      /customer feedback/,
      /complaint/,
      /what do customers like/,
      /sentiment/,
      /love most/,
      /complaining about/,
      /need improvement/,
    ],
  },
  {
    intent: "search",
    patterns: [
      /search/,
      /customers (are )?looking for/,
      /no results/,
      /search demand/,
      /new products should we add/,
      /no matching products?/,
    ],
  },
  {
    intent: "email_marketing",
    patterns: [
      /email/,
      /newsletter/,
      /campaign/,
      /subscribers/,
      /what should i email/,
      /which subscribers should receive promotions?/,
      /suggest a campaign/,
      /furniture/,
      /jewelry|jewellery/,
      /electronics/,
    ],
  },
  {
    intent: "categories",
    patterns: [/categor/, /which categories/],
  },
  {
    intent: "discounts",
    patterns: [/discount/, /promo code/, /coupon/],
  },
  {
    intent: "product_opportunities",
    patterns: [
      /high views.*low sales/,
      /opportunit/,
      /conversion/,
      /cart add/,
      /visibility/,
      /growth opportunit/,
    ],
  },
  {
    intent: "pricing",
    patterns: [
      /underpriced/,
      /overpriced/,
      /pricing opportunit/,
      /analyze (product )?pricing/,
      /dynamic pric/,
      /price optim/,
      /should (receive|get) discounts?/,
      /increase price/,
      /which products.*(discount|price)/,
      /show pricing/,
    ],
  },
];

const INTENT_DATA_SOURCES: Record<CopilotIntent, string[]> = {
  overview: ["Orders", "Products", "Reviews", "Subscribers"],
  revenue: ["Orders", "Order Items"],
  sales_trends: ["Orders", "Order Items", "Revenue Analytics"],
  trending_products: ["Orders", "Order Items", "Products", "Search Analytics", "Reviews"],
  low_performing_products: ["Orders", "Order Items", "Products", "Search Analytics"],
  promotion_recommendations: [
    "Products",
    "Orders",
    "Order Items",
    "Discounts",
    "Reviews",
    "Inventory",
  ],
  inventory: ["Products", "Orders", "Order Items", "Inventory"],
  products: ["Products", "Categories", "Inventory"],
  orders: ["Orders", "Customers"],
  reviews: ["Reviews"],
  search: ["Search Analytics", "Products"],
  email_marketing: [
    "Subscribers",
    "Email Campaigns",
    "Products",
    "Discounts",
  ],
  categories: ["Orders", "Categories"],
  discounts: ["Products", "Orders", "Order Items", "Discounts"],
  product_opportunities: [
    "Products",
    "Orders",
    "Order Items",
    "Search Analytics",
    "Reviews",
    "Inventory",
  ],
  pricing: [
    "Products",
    "Orders",
    "Order Items",
    "Reviews",
    "Inventory",
    "Pricing Analytics",
  ],
};

export function routeCopilotQuestion(question: string): CopilotIntent[] {
  const normalized = question.trim().toLowerCase();
  const matched = new Set<CopilotIntent>();

  for (const rule of INTENT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      matched.add(rule.intent);
    }
  }

  if (matched.size === 0) {
    matched.add("overview");
    matched.add("revenue");
    if (/product|selling|seller|sold|stock|catalog/.test(normalized)) {
      matched.add("trending_products");
      matched.add("products");
    }
    if (/order|shipped|delivered|pending/.test(normalized)) {
      matched.add("orders");
    }
  }

  if (matched.has("inventory")) {
    matched.add("products");
    if (/forecast|30 day|run out|stockout|momentum/.test(normalized)) {
      matched.add("sales_trends");
    }
  }

  if (matched.has("trending_products")) {
    matched.add("products");
  }

  if (matched.has("categories")) {
    matched.add("products");
  }

  if (
    matched.has("promotion_recommendations") ||
    matched.has("trending_products")
  ) {
    matched.add("product_opportunities");
  }

  if (matched.has("overview")) {
    matched.add("sales_trends");
    matched.add("orders");
  }

  if (/(furniture|jewelry|jewellery|electronics)/.test(normalized)) {
    matched.add("email_marketing");
    matched.add("categories");
  }

  if (/risk|opportunit|aware of/.test(normalized)) {
    matched.add("product_opportunities");
  }

  if (/next quarter|quarter revenue/.test(normalized)) {
    matched.add("revenue");
    matched.add("sales_trends");
    matched.add("categories");
  }

  if (/30 days?|next 30/.test(normalized)) {
    matched.add("sales_trends");
    matched.add("inventory");
  }

  if (/inventory requirements?|forecast inventory/.test(normalized)) {
    matched.add("inventory");
    matched.add("sales_trends");
  }

  if (/growth opportunit/.test(normalized)) {
    matched.add("product_opportunities");
    matched.add("promotion_recommendations");
    matched.add("categories");
  }

  if (/expected to sell|sell most/.test(normalized)) {
    matched.add("trending_products");
    matched.add("sales_trends");
  }

  if (/categories will grow|categories.*grow/.test(normalized)) {
    matched.add("categories");
    matched.add("sales_trends");
  }

  if (/current growth continues|growth continues/.test(normalized)) {
    matched.add("revenue");
    matched.add("sales_trends");
  }

  return [...matched];
}

export function getDataSourcesForIntents(intents: CopilotIntent[]): string[] {
  const sources = new Set<string>();
  for (const intent of intents) {
    for (const source of INTENT_DATA_SOURCES[intent]) {
      sources.add(source);
    }
  }
  return [...sources].sort();
}
