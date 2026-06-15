import type { Id } from "../_generated/dataModel";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import {
  BEHAVIORAL_SEGMENT_KEYS,
  categoryInterestKey,
  HIGH_VALUE_SPENT_THRESHOLD,
  INACTIVE_CUSTOMER_DAYS,
  JEWELRY_KEYWORDS,
  OFFICE_FURNITURE_KEYWORDS,
  RECENT_BUYER_DAYS,
} from "./emailSegments";

export type CustomerOrderInsights = {
  interestTags: string[];
  orderCount: number;
  totalSpent: number;
  lastOrderAt: number | undefined;
};

type OrderItemWithCategory = {
  productName: string;
  categorySlug: string;
  categoryName: string;
};

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

export function computeInterestTagsFromPurchases(
  items: OrderItemWithCategory[]
): string[] {
  const tags = new Set<string>();

  for (const item of items) {
    tags.add(categoryInterestKey(item.categorySlug));

    const combined = `${item.productName} ${item.categoryName}`;
    if (
      item.categorySlug === "office" ||
      matchesKeywords(combined, OFFICE_FURNITURE_KEYWORDS)
    ) {
      tags.add(BEHAVIORAL_SEGMENT_KEYS.officeFurnitureInterested);
    }
    if (matchesKeywords(combined, JEWELRY_KEYWORDS)) {
      tags.add(BEHAVIORAL_SEGMENT_KEYS.jewelryInterested);
    }
  }

  return Array.from(tags);
}

export function applyBehavioralTags(
  tags: Set<string>,
  orderCount: number,
  totalSpent: number,
  lastOrderAt: number | undefined,
  now: number
): void {
  if (orderCount === 0 || !lastOrderAt) return;

  const daysSinceLastOrder = (now - lastOrderAt) / (1000 * 60 * 60 * 24);

  if (daysSinceLastOrder <= RECENT_BUYER_DAYS) {
    tags.add(BEHAVIORAL_SEGMENT_KEYS.recentBuyers);
  }

  if (totalSpent >= HIGH_VALUE_SPENT_THRESHOLD) {
    tags.add(BEHAVIORAL_SEGMENT_KEYS.highValueCustomers);
  }

  if (daysSinceLastOrder > INACTIVE_CUSTOMER_DAYS) {
    tags.add(BEHAVIORAL_SEGMENT_KEYS.inactiveCustomers);
  }
}

export async function loadCustomerPurchases(
  ctx: QueryCtx | MutationCtx,
  email: string
): Promise<OrderItemWithCategory[]> {
  const normalizedEmail = email.trim().toLowerCase();
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_customer_email", (q) => q.eq("customerEmail", normalizedEmail))
    .collect();

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const items: OrderItemWithCategory[] = [];

  for (const order of paidOrders) {
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order_id", (q) => q.eq("orderId", order._id))
      .collect();

    for (const line of orderItems) {
      const product = await ctx.db.get(line.productId);
      if (!product) continue;
      const category = await ctx.db.get(product.categoryId);
      if (!category) continue;

      items.push({
        productName: line.productName,
        categorySlug: category.slug,
        categoryName: category.name,
      });
    }
  }

  return items;
}

export async function computeCustomerInsights(
  ctx: QueryCtx | MutationCtx,
  email: string,
  now: number
): Promise<CustomerOrderInsights> {
  const normalizedEmail = email.trim().toLowerCase();
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_customer_email", (q) => q.eq("customerEmail", normalizedEmail))
    .collect();

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const orderCount = paidOrders.length;
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const lastOrderAt =
    paidOrders.length > 0
      ? Math.max(...paidOrders.map((o) => o.paidAt ?? o.createdAt))
      : undefined;

  const purchaseItems = await loadCustomerPurchases(ctx, normalizedEmail);
  const tagSet = new Set(computeInterestTagsFromPurchases(purchaseItems));
  applyBehavioralTags(tagSet, orderCount, totalSpent, lastOrderAt, now);

  return {
    interestTags: Array.from(tagSet),
    orderCount,
    totalSpent,
    lastOrderAt,
  };
}

export async function upsertSubscriberInterestProfile(
  ctx: MutationCtx,
  subscriberId: Id<"subscribers">,
  email: string,
  insights: CustomerOrderInsights,
  now: number
): Promise<void> {
  const existing = await ctx.db
    .query("subscriberInterestProfiles")
    .withIndex("by_subscriber", (q) => q.eq("subscriberId", subscriberId))
    .unique();

  const data = {
    subscriberId,
    email: email.trim().toLowerCase(),
    interestTags: insights.interestTags,
    orderCount: insights.orderCount,
    totalSpent: insights.totalSpent,
    lastOrderAt: insights.lastOrderAt,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, data);
  } else if (insights.orderCount > 0) {
    await ctx.db.insert("subscriberInterestProfiles", data);
  }
}

export function subscriberMatchesSegmentKey(
  profile: {
    interestTags: string[];
    orderCount: number;
    totalSpent: number;
    lastOrderAt?: number;
  } | null,
  segmentKey: string,
  now: number
): boolean {
  if (segmentKey === "all_subscribers") return true;
  if (!profile || profile.orderCount === 0) return false;

  if (profile.interestTags.includes(segmentKey)) return true;

  const daysSinceLastOrder = profile.lastOrderAt
    ? (now - profile.lastOrderAt) / (1000 * 60 * 60 * 24)
    : Infinity;

  if (segmentKey === BEHAVIORAL_SEGMENT_KEYS.recentBuyers) {
    return daysSinceLastOrder <= RECENT_BUYER_DAYS;
  }
  if (segmentKey === BEHAVIORAL_SEGMENT_KEYS.highValueCustomers) {
    return profile.totalSpent >= HIGH_VALUE_SPENT_THRESHOLD;
  }
  if (segmentKey === BEHAVIORAL_SEGMENT_KEYS.inactiveCustomers) {
    return daysSinceLastOrder > INACTIVE_CUSTOMER_DAYS;
  }

  return false;
}
