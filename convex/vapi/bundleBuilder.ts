import { parseSearchQuery } from "../lib/search/queryParser";
import { calculateFinalPrice } from "../lib/pricing";

export type BundleSlot = {
  id: string;
  label: string;
  searchQuery: string;
  budgetShare: number;
  keywords: string[];
};

export type BundleCandidate = {
  productId: string;
  title: string;
  price: number;
  finalPrice: number;
  category: string;
  stars: number;
  reason: string;
  slot: string;
};

export type BundleResult = {
  answer: string;
  bundle: Array<{ title: string; price: number; reason: string; productId: string }>;
  total: number;
  budget: number;
  remainingBudget: number;
};

const OFFICE_SLOTS: BundleSlot[] = [
  {
    id: "desk",
    label: "Desk",
    searchQuery: "office desk workstation",
    budgetShare: 0.4,
    keywords: ["desk", "table", "workstation"],
  },
  {
    id: "chair",
    label: "Chair",
    searchQuery: "office chair ergonomic seating",
    budgetShare: 0.35,
    keywords: ["chair", "seating", "ergonomic"],
  },
  {
    id: "storage",
    label: "Storage",
    searchQuery: "office storage shelf cabinet",
    budgetShare: 0.15,
    keywords: ["storage", "shelf", "cabinet", "drawer"],
  },
  {
    id: "accessories",
    label: "Accessories",
    searchQuery: "office accessory lamp mat",
    budgetShare: 0.1,
    keywords: ["lamp", "accessory", "mat", "organizer"],
  },
];

const DEFAULT_SLOTS: BundleSlot[] = [
  {
    id: "primary",
    label: "Primary item",
    searchQuery: "",
    budgetShare: 0.7,
    keywords: [],
  },
  {
    id: "secondary",
    label: "Complementary item",
    searchQuery: "",
    budgetShare: 0.3,
    keywords: [],
  },
];

export function resolveBundleSlots(query: string): BundleSlot[] {
  const lower = query.toLowerCase();
  const isOffice =
    lower.includes("office") ||
    lower.includes("furniture") ||
    lower.includes("workspace") ||
    lower.includes("work from home");

  if (isOffice) {
    return OFFICE_SLOTS.map((slot) => ({
      ...slot,
      searchQuery: slot.searchQuery || query,
    }));
  }

  return DEFAULT_SLOTS.map((slot, index) => ({
    ...slot,
    searchQuery: index === 0 ? query : `${query} accessory`,
  }));
}

export function parseBundleBudget(
  query: string,
  budgetOverride?: number,
  categories: Array<{ name: string; slug: string }> = []
): { budget: number; cleanedQuery: string } {
  if (budgetOverride !== undefined && budgetOverride > 0) {
    return { budget: budgetOverride, cleanedQuery: query.trim() };
  }

  const parsed = parseSearchQuery(query, categories);
  const budget = parsed.maxPrice ?? 500;
  return { budget, cleanedQuery: parsed.embeddingQuery || query.trim() };
}

type RankedProduct = {
  _id: string;
  name: string;
  finalPrice: number;
  categoryName: string;
  stars: number;
  reviews: number;
  inStock: boolean;
};

export function pickBundleItem(
  products: RankedProduct[],
  slot: BundleSlot,
  slotBudget: number,
  usedProductIds: Set<string>
): BundleCandidate | null {
  const eligible = products
    .filter(
      (p) =>
        p.inStock &&
        p.finalPrice <= slotBudget &&
        !usedProductIds.has(p._id)
    )
    .sort((a, b) => {
      const scoreA = a.stars * 2 + Math.min(a.reviews, 100) / 100;
      const scoreB = b.stars * 2 + Math.min(b.reviews, 100) / 100;
      return scoreB - scoreA || a.finalPrice - b.finalPrice;
    });

  const picked = eligible[0];
  if (!picked) return null;

  const reasons: string[] = [];
  if (picked.finalPrice <= slotBudget * 0.8) {
    reasons.push(`fits well under the ${slot.label.toLowerCase()} budget`);
  } else {
    reasons.push(`within the ${slot.label.toLowerCase()} budget`);
  }
  if (picked.stars >= 4) {
    reasons.push(`${picked.stars}-star rating`);
  }
  if (picked.categoryName) {
    reasons.push(`matches ${picked.categoryName}`);
  }

  return {
    productId: picked._id,
    title: picked.name,
    price: picked.finalPrice,
    finalPrice: picked.finalPrice,
    category: picked.categoryName,
    stars: picked.stars,
    reason: reasons.slice(0, 2).join(" and "),
    slot: slot.id,
  };
}

export function buildBundleFromCandidates(
  candidates: BundleCandidate[],
  budget: number,
  query: string
): BundleResult {
  const bundle = candidates.map((item) => ({
    title: item.title,
    price: item.finalPrice,
    reason: item.reason,
    productId: item.productId,
  }));

  const total = bundle.reduce((sum, item) => sum + item.price, 0);
  const remainingBudget = Math.max(0, budget - total);

  let answer: string;
  if (bundle.length === 0) {
    answer = `I couldn't find in-stock products matching "${query}" within a $${budget.toFixed(0)} budget. Try a higher budget or different categories.`;
  } else if (bundle.length === 1) {
    answer = `I found one great option for "${query}" within your $${budget.toFixed(0)} budget.`;
  } else {
    answer = `I built a ${bundle.length}-item bundle for "${query}" under your $${budget.toFixed(0)} budget, totaling $${total.toFixed(2)}.`;
  }

  return { answer, bundle, total, budget, remainingBudget };
}

export function toRankedProduct(product: {
  _id: string;
  name: string;
  price: number;
  discountPercent: number;
  categoryName: string;
  stars: number;
  reviews: number;
  stock?: number;
}): RankedProduct {
  return {
    _id: product._id,
    name: product.name,
    finalPrice: calculateFinalPrice(product.price, product.discountPercent ?? 0),
    categoryName: product.categoryName,
    stars: product.stars,
    reviews: product.reviews,
    inStock: (product.stock ?? 0) > 0,
  };
}
