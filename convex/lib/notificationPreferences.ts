import type { MutationCtx, QueryCtx } from "../_generated/server";
import { normalizeEmail } from "./publicOrderDto";

export type ResolvedNotificationPreferences = {
  orderUpdates: boolean;
  paymentUpdates: boolean;
  promotionalNotifications: boolean;
};

const DEFAULT_PREFERENCES: ResolvedNotificationPreferences = {
  orderUpdates: true,
  paymentUpdates: true,
  promotionalNotifications: false,
};

export async function getNotificationPreferencesForEmail(
  ctx: QueryCtx | MutationCtx,
  customerEmail: string
): Promise<ResolvedNotificationPreferences> {
  const normalized = normalizeEmail(customerEmail);
  const row = await ctx.db
    .query("customerNotificationPreferences")
    .withIndex("by_customer_email", (q) => q.eq("customerEmail", normalized))
    .unique();

  if (!row) {
    return DEFAULT_PREFERENCES;
  }

  return {
    orderUpdates: row.orderUpdates,
    paymentUpdates: row.paymentUpdates,
    promotionalNotifications: row.promotionalNotifications,
  };
}

export async function upsertNotificationPreferences(
  ctx: MutationCtx,
  args: {
    customerEmail: string;
    orderUpdates: boolean;
    paymentUpdates: boolean;
    promotionalNotifications: boolean;
  }
) {
  const normalized = normalizeEmail(args.customerEmail);
  const now = Date.now();
  const existing = await ctx.db
    .query("customerNotificationPreferences")
    .withIndex("by_customer_email", (q) => q.eq("customerEmail", normalized))
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      orderUpdates: args.orderUpdates,
      paymentUpdates: args.paymentUpdates,
      promotionalNotifications: args.promotionalNotifications,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert("customerNotificationPreferences", {
    customerEmail: normalized,
    orderUpdates: args.orderUpdates,
    paymentUpdates: args.paymentUpdates,
    promotionalNotifications: args.promotionalNotifications,
    updatedAt: now,
  });
}
