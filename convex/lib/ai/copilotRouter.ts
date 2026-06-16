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
    ],
  },
  {
    intent: "sales_trends",
    patterns: [/sales trend/, /order trend/, /growth trend/],
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
    ],
  },
  {
    intent: "search",
    patterns: [
      /search/,
      /customers (are )?looking for/,
      /no results/,
      /search demand/,
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
    ],
  },
];

const INTENT_DATA_SOURCES: Record<CopilotIntent, string[]> = {
  overview: ["Orders", "Products", "Reviews", "Subscribers"],
  revenue: ["Orders"],
  sales_trends: ["Orders"],
  trending_products: ["Orders", "Products", "Search Analytics", "Reviews"],
  low_performing_products: ["Orders", "Products", "Search Analytics"],
  promotion_recommendations: [
    "Products",
    "Orders",
    "Discounts",
    "Reviews",
    "Inventory",
  ],
  inventory: ["Products", "Orders", "Inventory"],
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
  discounts: ["Products", "Orders", "Discounts"],
  product_opportunities: [
    "Products",
    "Orders",
    "Search Analytics",
    "Reviews",
    "Inventory",
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
