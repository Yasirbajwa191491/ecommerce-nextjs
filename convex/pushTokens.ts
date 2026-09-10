import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { pushPlatformValidator } from "./lib/notificationTypes";
import { emailsMatch } from "./lib/orderAccess";
import { normalizeEmail } from "./lib/publicOrderDto";
import { upsertNotificationPreferences } from "./lib/notificationPreferences";

function isValidExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

async function assertPushEmailAuthorization(
  ctx: MutationCtx,
  args: {
    customerEmail: string;
    visitorId: string;
    expoPushToken: string;
    accessToken?: string;
  }
): Promise<void> {
  const existingByToken = await ctx.db
    .query("pushTokens")
    .withIndex("by_expo_push_token", (q) => q.eq("expoPushToken", args.expoPushToken))
    .unique();

  if (existingByToken && emailsMatch(existingByToken.customerEmail, args.customerEmail)) {
    return;
  }

  const visitorTokens = await ctx.db
    .query("pushTokens")
    .withIndex("by_visitor_id", (q) => q.eq("visitorId", args.visitorId))
    .collect();

  if (visitorTokens.some((token) => emailsMatch(token.customerEmail, args.customerEmail))) {
    return;
  }

  const accessToken = args.accessToken?.trim();
  if (!accessToken) {
    throw new ConvexError(
      "Verify a recent order before enabling push notifications for this email."
    );
  }

  const order = await ctx.db
    .query("orders")
    .withIndex("by_access_token", (q) => q.eq("accessToken", accessToken))
    .unique();

  if (!order || !emailsMatch(order.customerEmail, args.customerEmail)) {
    throw new ConvexError("Push notification registration could not be verified.");
  }
}

export const registerPushToken = mutation({
  args: {
    customerEmail: v.string(),
    visitorId: v.string(),
    expoPushToken: v.string(),
    platform: pushPlatformValidator,
    deviceName: v.optional(v.string()),
    appVersion: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  returns: v.object({
    tokenId: v.id("pushTokens"),
    created: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const customerEmail = normalizeEmail(args.customerEmail);
    const visitorId = args.visitorId.trim();
    const expoPushToken = args.expoPushToken.trim();

    if (!customerEmail.includes("@")) {
      throw new ConvexError("A valid customer email is required for push notifications.");
    }
    if (!visitorId) {
      throw new ConvexError("Visitor ID is required.");
    }
    if (!isValidExpoPushToken(expoPushToken)) {
      throw new ConvexError("Invalid Expo push token format.");
    }

    await assertPushEmailAuthorization(ctx, {
      customerEmail,
      visitorId,
      expoPushToken,
      accessToken: args.accessToken,
    });

    const now = Date.now();
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_expo_push_token", (q) => q.eq("expoPushToken", expoPushToken))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerEmail,
        visitorId,
        platform: args.platform,
        deviceName: args.deviceName?.trim() || undefined,
        appVersion: args.appVersion?.trim() || undefined,
        isActive: true,
        lastSeenAt: now,
        updatedAt: now,
      });
      return { tokenId: existing._id, created: false };
    }

    const tokenId = await ctx.db.insert("pushTokens", {
      customerEmail,
      visitorId,
      expoPushToken,
      platform: args.platform,
      deviceName: args.deviceName?.trim() || undefined,
      appVersion: args.appVersion?.trim() || undefined,
      isActive: true,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    });

    return { tokenId, created: true };
  },
});

export const touchPushToken = mutation({
  args: {
    expoPushToken: v.string(),
    customerEmail: v.optional(v.string()),
    visitorId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const expoPushToken = args.expoPushToken.trim();
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_expo_push_token", (q) => q.eq("expoPushToken", expoPushToken))
      .unique();

    if (!existing) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(existing._id, {
      lastSeenAt: now,
      updatedAt: now,
      isActive: true,
      ...(args.visitorId ? { visitorId: args.visitorId.trim() } : {}),
    });

    return null;
  },
});

export const deactivatePushTokensForVisitor = mutation({
  args: {
    visitorId: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const visitorId = args.visitorId.trim();
    if (!visitorId) {
      return 0;
    }

    const tokens = await ctx.db
      .query("pushTokens")
      .withIndex("by_visitor_id", (q) => q.eq("visitorId", visitorId))
      .collect();

    const now = Date.now();
    let count = 0;
    for (const token of tokens) {
      if (!token.isActive) continue;
      await ctx.db.patch(token._id, {
        isActive: false,
        updatedAt: now,
      });
      count += 1;
    }

    return count;
  },
});

export const deactivatePushToken = mutation({
  args: {
    expoPushToken: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_expo_push_token", (q) => q.eq("expoPushToken", args.expoPushToken.trim()))
      .unique();

    if (!existing) {
      return null;
    }

    await ctx.db.patch(existing._id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const syncNotificationPreferences = mutation({
  args: {
    customerEmail: v.string(),
    orderUpdates: v.boolean(),
    paymentUpdates: v.boolean(),
    promotionalNotifications: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await upsertNotificationPreferences(ctx, {
      customerEmail: args.customerEmail,
      orderUpdates: args.orderUpdates,
      paymentUpdates: args.paymentUpdates,
      promotionalNotifications: args.promotionalNotifications,
    });
    return null;
  },
});

export const getNotificationPreferences = query({
  args: {
    customerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeEmail(args.customerEmail);
    const row = await ctx.db
      .query("customerNotificationPreferences")
      .withIndex("by_customer_email", (q) => q.eq("customerEmail", normalized))
      .unique();

    return {
      orderUpdates: row?.orderUpdates ?? true,
      paymentUpdates: row?.paymentUpdates ?? true,
      promotionalNotifications: row?.promotionalNotifications ?? false,
    };
  },
});
