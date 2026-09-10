import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { orderNotificationEventValidator } from "./lib/notificationTypes";
import { normalizeEmail } from "./lib/publicOrderDto";
import { paginationOptsValidator } from "convex/server";

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
  },
  returns: v.id("inAppNotifications"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("inAppNotifications", {
      customerEmail: normalizeEmail(args.customerEmail),
      visitorId: args.visitorId,
      type: args.type,
      title: args.title,
      body: args.body,
      orderId: args.orderId,
      orderNumber: args.orderNumber,
      deepLinkPath: args.deepLinkPath,
      metadata: args.metadata,
      createdAt: Date.now(),
    });
  },
});

export const listForCustomer = query({
  args: {
    customerEmail: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const customerEmail = normalizeEmail(args.customerEmail);
    return await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_created", (q) =>
        q.eq("customerEmail", customerEmail)
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const getUnreadCount = query({
  args: {
    customerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const customerEmail = normalizeEmail(args.customerEmail);
    const unread = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_unread", (q) =>
        q.eq("customerEmail", customerEmail).eq("readAt", undefined)
      )
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("inAppNotifications"),
    customerEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      return null;
    }

    if (notification.customerEmail !== normalizeEmail(args.customerEmail)) {
      return null;
    }

    if (notification.readAt) {
      return null;
    }

    await ctx.db.patch(args.notificationId, {
      readAt: Date.now(),
    });

    return null;
  },
});

export const markAllAsRead = mutation({
  args: {
    customerEmail: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const customerEmail = normalizeEmail(args.customerEmail);
    const unread = await ctx.db
      .query("inAppNotifications")
      .withIndex("by_customer_email_unread", (q) =>
        q.eq("customerEmail", customerEmail).eq("readAt", undefined)
      )
      .collect();

    const now = Date.now();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, { readAt: now });
    }

    return unread.length;
  },
});
