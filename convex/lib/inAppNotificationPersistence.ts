import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { OrderNotificationEvent } from "./notificationTypes";
import { computeNotificationExpiresAt } from "./notificationRetention";
import { normalizeEmail } from "./publicOrderDto";

export async function upsertInAppNotificationForEvent(
  ctx: MutationCtx,
  args: {
    eventKey: string;
    customerEmail: string;
    type: OrderNotificationEvent;
    title: string;
    body: string;
    orderId?: Id<"orders">;
    orderNumber?: string;
    deepLinkPath?: string;
    metadata?: string;
  }
): Promise<Id<"inAppNotifications"> | null> {
  const existing = await ctx.db
    .query("inAppNotifications")
    .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
    .unique();

  if (existing) {
    return existing._id;
  }

  const now = Date.now();
  return await ctx.db.insert("inAppNotifications", {
    customerEmail: normalizeEmail(args.customerEmail),
    eventKey: args.eventKey,
    type: args.type,
    title: args.title,
    body: args.body,
    orderId: args.orderId,
    orderNumber: args.orderNumber,
    deepLinkPath: args.deepLinkPath,
    metadata: args.metadata,
    expiresAt: computeNotificationExpiresAt(now),
    createdAt: now,
  });
}
