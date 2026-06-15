/** Behavioral segment keys (fixed). */
export const BEHAVIORAL_SEGMENT_KEYS = {
  recentBuyers: "recent_buyers",
  highValueCustomers: "high_value_customers",
  inactiveCustomers: "inactive_customers",
  officeFurnitureInterested: "office_furniture_interested",
  jewelryInterested: "jewelry_interested",
} as const;

export const RECENT_BUYER_DAYS = 90;
export const INACTIVE_CUSTOMER_DAYS = 180;
export const HIGH_VALUE_SPENT_THRESHOLD = 500;

export const OFFICE_FURNITURE_KEYWORDS = [
  "chair",
  "desk",
  "bookshelf",
  "office",
  "workspace",
  "ergonomic",
];

export const JEWELRY_KEYWORDS = [
  "jewelry",
  "jewellery",
  "necklace",
  "ring",
  "bracelet",
  "earring",
  "pendant",
  "gold",
  "silver",
];

export type SegmentDefinition = {
  key: string;
  label: string;
  description: string;
  kind: "all" | "category" | "behavioral" | "keyword";
};

export function categoryInterestKey(slug: string): string {
  return `${slug.toLowerCase().replace(/\s+/g, "_")}_interested`;
}

export function buildCategorySegments(
  categories: { name: string; slug: string }[]
): SegmentDefinition[] {
  return categories.map((cat) => ({
    key: categoryInterestKey(cat.slug),
    label: `${cat.name} Interested`,
    description: `Subscribers who purchased ${cat.name.toLowerCase()} products`,
    kind: "category" as const,
  }));
}

export function buildBehavioralSegments(): SegmentDefinition[] {
  return [
    {
      key: BEHAVIORAL_SEGMENT_KEYS.recentBuyers,
      label: "Recent Buyers",
      description: "Ordered within the last 90 days",
      kind: "behavioral",
    },
    {
      key: BEHAVIORAL_SEGMENT_KEYS.highValueCustomers,
      label: "High Value Customers",
      description: `Total spend of $${HIGH_VALUE_SPENT_THRESHOLD}+`,
      kind: "behavioral",
    },
    {
      key: BEHAVIORAL_SEGMENT_KEYS.inactiveCustomers,
      label: "Inactive Customers",
      description: "Has orders but none in the last 180 days",
      kind: "behavioral",
    },
    {
      key: BEHAVIORAL_SEGMENT_KEYS.officeFurnitureInterested,
      label: "Office Furniture Interested",
      description: "Purchased office furniture or workspace items",
      kind: "keyword",
    },
    {
      key: BEHAVIORAL_SEGMENT_KEYS.jewelryInterested,
      label: "Jewelry Interested",
      description: "Purchased jewelry or accessories",
      kind: "keyword",
    },
  ];
}

export function buildAllSegments(
  categories: { name: string; slug: string }[]
): SegmentDefinition[] {
  return [
    {
      key: "all_subscribers",
      label: "All Subscribers",
      description: "Every active subscriber",
      kind: "all",
    },
    ...buildCategorySegments(categories),
    ...buildBehavioralSegments(),
  ];
}

export type SegmentCriteria = {
  segmentKeys: string[];
};

export function parseSegmentCriteria(raw?: string): SegmentCriteria | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as SegmentCriteria;
    if (!Array.isArray(parsed.segmentKeys)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeSegmentCriteria(keys: string[]): string {
  return JSON.stringify({ segmentKeys: keys });
}
