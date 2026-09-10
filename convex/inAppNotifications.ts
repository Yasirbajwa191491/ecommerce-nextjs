import { v, ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { assertNotificationCustomerAccess } from "./lib/notificationAccess";
import { upsertInAppNotificationForEvent } from "./lib/inAppNotificationPersistence";
import { computeNotificationExpiresAt } from "./lib/notificationRetention";
import { orderNotificationEventValidator } from "./lib/notificationTypes";
import { hasOrderAccess } from "./lib/orderAccess";
import { normalizeEmail } from "./lib/publicOrderDto";
import { paginationOptsValidator } from "convex/server";

const UNREAD_COUNT_CAP = 99;
const PURGE_BATCH_SIZE = 100;

export const purgeExpiredNotifications = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_expires_at", (q) => q.lt("expiresAt", now))
      .take(PURGE_BATCH_SIZE);

    for (const notification of expired) {
      await ctx.db.delete(notification._id);
    }

    if (expired.length > 0) {
      console.info(`[notifications] purged ${expired.length} expired in-app notifications`);
    }

    return { deleted: expired.length };
  },
});

export const upsertForEvent = internalMutation({
  args: {
    eventKey: v.string(),
    customerEmail: v.string(),
    type: orderNotificationEventValidator,
    title: v.string(),
    body: v.string(),
    orderId: v.optional(v.id("orders")),
    orderNumber: v.optional(v.string()),
    deepLinkPath: v.optional(v.string()),
    metadata: v.optional(v.string()),
  },
  returns: v.union(v.id("inAppNotifications"), v.null()),
  handler: async (ctx, args) => {
    return await upsertInAppNotificationForEvent(ctx, args);
  },
});

/** @deprecated Use upsertForEvent */
export const createInAppNotification = internalMutation({
  args: {
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    type: orderNotificationEventValidator,
    title: v.string(),
    body: v.string(),
    orderId: v.optional(v.id("orders")),
    orderNumber: v.optional(v.string()),
    deepLinkPath: v.optional(v.string()),
    metadata: v.optional(v.string()),
    eventKey: v.optional(v.string()),
  },
  returns: v.id("inAppNotifications"),
  handler: async (ctx, args) => {
    const eventKey =
      args.eventKey ??
      `legacy:${args.orderId ?? "none"}:${args.type}:${Date.now()}`;

    const id = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
      .unique();

    if (id) {
      return id._id;
    }

    const now = Date.now();
    return await ctx.db.insert("inAppNotifications", {
      customerEmail: normalizeEmail(args.customerEmail),
      eventKey,
      visitorId: args.visitorId,
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
  },
});

export const listForCustomer = query({
  args: {
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const customerEmail = normalizeEmail(args.customerEmail);
    const page = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_created", (q) =>
        q.eq("customerEmail", customerEmail)
      )
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...page,
      page: page.page.filter((notification) => !notification.archivedAt),
    };
  },
});

export const getUnreadCount = query({
  args: {
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.object({
    count: v.number(),
    capped: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const customerEmail = normalizeEmail(args.customerEmail);
    const unread = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_unread", (q) =>
        q.eq("customerEmail", customerEmail).eq("readAt", undefined)
      )
      .take(UNREAD_COUNT_CAP + 1);

    const activeUnread = unread.filter((notification) => !notification.archivedAt);
    const capped = activeUnread.length > UNREAD_COUNT_CAP;

    return {
      count: capped ? UNREAD_COUNT_CAP : activeUnread.length,
      capped,
    };
  },
});

export const resolveNotificationTargetByEventKey = query({
  args: {
    eventKey: v.string(),
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const notification = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
      .unique();

    if (
      !notification ||
      notification.customerEmail !== normalizeEmail(args.customerEmail) ||
      notification.archivedAt
    ) {
      return null;
    }

    if (notification.orderId) {
      const order = await ctx.db.get(notification.orderId);
      if (
        !order ||
        !hasOrderAccess(order, {
          customerEmail: args.customerEmail,
          accessToken: args.accessToken,
        })
      ) {
        throw new ConvexError("You do not have access to this order notification.");
      }
    }

    return {
      notificationId: notification._id,
      eventKey: notification.eventKey,
      deepLinkPath: notification.deepLinkPath ?? null,
      orderNumber: notification.orderNumber ?? null,
      orderId: notification.orderId ?? null,
    };
  },
});

export const resolveNotificationTarget = query({
  args: {
    notificationId: v.id("inAppNotifications"),
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.customerEmail !== normalizeEmail(args.customerEmail) ||
      notification.archivedAt
    ) {
      return null;
    }

    if (notification.orderId) {
      const order = await ctx.db.get(notification.orderId);
      if (
        !order ||
        !hasOrderAccess(order, {
          customerEmail: args.customerEmail,
          accessToken: args.accessToken,
        })
      ) {
        throw new ConvexError("You do not have access to this order notification.");
      }
    }

    return {
      notificationId: notification._id,
      eventKey: notification.eventKey,
      deepLinkPath: notification.deepLinkPath ?? null,
      orderNumber: notification.orderNumber ?? null,
      orderId: notification.orderId ?? null,
    };
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("inAppNotifications"),
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    eventKey: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    let notification = await ctx.db.get(args.notificationId);

    if (!notification && args.eventKey) {
      notification = await ctx.db
        .query("inAppNotifications")
        .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey!))
        .unique();
    }

    if (!notification) {
      return null;
    }

    if (notification.customerEmail !== normalizeEmail(args.customerEmail)) {
      return null;
    }

    if (notification.readAt) {
      return null;
    }

    await ctx.db.patch(notification._id, {
      readAt: Date.now(),
    });

    return null;
  },
});

export const markAllAsRead = mutation({
  args: {
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const customerEmail = normalizeEmail(args.customerEmail);
    const unread = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_unread", (q) =>
        q.eq("customerEmail", customerEmail).eq("readAt", undefined)
      )
      .collect();

    const now = Date.now();
    let count = 0;
    for (const notification of unread) {
      if (notification.archivedAt) continue;
      await ctx.db.patch(notification._id, { readAt: now });
      count += 1;
    }

    return count;
  },
});

export const archiveNotification = mutation({
  args: {
    notificationId: v.id("inAppNotifications"),
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const notification = await ctx.db.get(args.notificationId);
    if (
      !notification ||
      notification.customerEmail !== normalizeEmail(args.customerEmail)
    ) {
      return null;
    }

    if (notification.archivedAt) {
      return null;
    }

    await ctx.db.patch(args.notificationId, {
      archivedAt: Date.now(),
    });

    return null;
  },
});

export const markReadByEventKey = mutation({
  args: {
    eventKey: v.string(),
    customerEmail: v.string(),
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, {
      customerEmail: args.customerEmail,
      visitorId: args.visitorId,
      accessToken: args.accessToken,
    });

    const notification = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
      .unique();

    if (
      !notification ||
      notification.customerEmail !== normalizeEmail(args.customerEmail) ||
      notification.readAt
    ) {
      return null;
    }

    await ctx.db.patch(notification._id, {
      readAt: Date.now(),
    });

    return null;
  },
});
