import { requireGuest } from "./lib/guestIdentity";
import { assertNotificationCustomerAccess } from "./lib/notificationAccess";
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./server";
import type { MutationCtx } from "./_generated/server";
import { pushPlatformValidator } from "./lib/notificationTypes";
import { emailsMatch } from "./lib/orderAccess";
import { normalizeEmail } from "./lib/publicOrderDto";
import { upsertNotificationPreferences } from "./lib/notificationPreferences";
import { isStandalonePushEnvironment } from "./lib/pushTokenSelection";

function isValidExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[")
  );
}

async function assertPushEmailAuthorization(
  ctx: MutationCtx,
  args: { customerEmail: string; visitorId: string; expoPushToken: string; accessToken?: string }
): Promise<void> {
  const existing = await ctx.db.query("pushTokens").withIndex("by_expo_push_token", q => q.eq("expoPushToken", args.expoPushToken)).unique();
  if (existing && existing.visitorId !== args.visitorId && !emailsMatch(existing.customerEmail, args.customerEmail)) throw new ConvexError("Push token is registered to another guest session.");
  // Account-wide notification access requires mailbox proof, never checkout contact data alone.
  try { await assertNotificationCustomerAccess(ctx, args); }
  catch (error) {
    if (error instanceof ConvexError) throw new ConvexError("Use the emailed secure order-recovery code to verify this email before enabling account-wide notifications.");
    throw error;
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
    executionEnvironment: v.optional(v.string()),
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

    await requireGuest(ctx, visitorId);
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

    const executionEnvironment = args.executionEnvironment?.trim() || undefined;

    if (
      executionEnvironment &&
      isStandalonePushEnvironment(executionEnvironment)
    ) {
      let cursor: string | null = null;
      do {
        const page = await ctx.db.query("pushTokens").withIndex("by_visitor_id", q => q.eq("visitorId", visitorId)).paginate({ numItems: 25, cursor });
        for (const token of page.page) {
          if (token.isActive && token.expoPushToken !== expoPushToken && token.executionEnvironment === "storeClient") await ctx.db.patch(token._id, { isActive: false, updatedAt: now });
        }
        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        customerEmail,
        visitorId,
        platform: args.platform,
        deviceName: args.deviceName?.trim() || undefined,
        appVersion: args.appVersion?.trim() || undefined,
        executionEnvironment,
        isActive: true,
        emailVerified: true,
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
      executionEnvironment,
      isActive: true,
      emailVerified: true,
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
    await requireGuest(ctx, args.visitorId ?? "");
    const expoPushToken = args.expoPushToken.trim();
    const existing = await ctx.db
      .query("pushTokens")
      .withIndex("by_expo_push_token", (q) => q.eq("expoPushToken", expoPushToken))
      .unique();

    if (!existing) {
      return null;
    }

    if (existing.visitorId !== args.visitorId || (args.customerEmail && !emailsMatch(existing.customerEmail, args.customerEmail))) throw new ConvexError("Push token ownership could not be verified.");
    if (!existing.isActive) return null;
    const now = Date.now();
    await ctx.db.patch(existing._id, { lastSeenAt: now, updatedAt: now });

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

    await requireGuest(ctx, visitorId);
    const now = Date.now(); let count = 0; let cursor: string | null = null;
    do {
      const page = await ctx.db.query("pushTokens").withIndex("by_visitor_id", q => q.eq("visitorId", visitorId)).paginate({ numItems: 25, cursor });
      for (const token of page.page) {
        if (token.isActive) { await ctx.db.patch(token._id, { isActive: false, updatedAt: now }); count++; }
      }
      cursor = page.isDone ? null : page.continueCursor;
    } while (cursor);

    return count;
  },
});

export const deactivatePushToken = mutation({
  args: {
    expoPushToken: v.string(),
    visitorId: v.optional(v.string()),
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

    await requireGuest(ctx, args.visitorId ?? "");
    if (existing.visitorId !== args.visitorId) throw new ConvexError("Push token ownership could not be verified.");
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
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    orderUpdates: v.boolean(),
    paymentUpdates: v.boolean(),
    promotionalNotifications: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, args);
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
    visitorId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertNotificationCustomerAccess(ctx, args);
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
