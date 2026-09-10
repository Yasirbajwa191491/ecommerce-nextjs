import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getChannelsForEvent, shouldSendPushForEvent } from "./lib/notificationChannels";
import { getNotificationPreferencesForEmail } from "./lib/notificationPreferences";
import {
  buildOrderDeepLinkPath,
  buildOrderNotificationCopy,
} from "./lib/notificationTemplates";
import { orderNotificationEventValidator } from "./lib/notificationTypes";
import {
  buildNotificationEventKey,
  shouldSkipConfirmedAfterPaymentSucceeded,
} from "./lib/orderNotificationLogic";

export const emitOrderNotificationEvent = internalMutation({
  args: {
    orderId: v.id("orders"),
    event: orderNotificationEventValidator,
    eventKey: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
    trackingInfo: v.optional(v.string()),
  },
  returns: v.object({
    emitted: v.boolean(),
    eventKey: v.string(),
  }),
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      return { emitted: false, eventKey: args.eventKey ?? "" };
    }

    if (
      shouldSkipConfirmedAfterPaymentSucceeded({
        event: args.event,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
      })
    ) {
      return {
        emitted: false,
        eventKey: args.eventKey ?? buildNotificationEventKey(args.orderId, args.event),
      };
    }

    const eventKey =
      args.eventKey ?? buildNotificationEventKey(args.orderId, args.event);

    const existing = await ctx.db
      .query("notificationEvents")
      .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
      .unique();

    if (existing) {
      return { emitted: false, eventKey };
    }

    await ctx.db.insert("notificationEvents", {
      eventKey,
      eventType: args.event,
      orderId: args.orderId,
      customerEmail: order.customerEmail,
      channelsAttempted: [],
      pushDelivered: false,
      emailDelivered: false,
      smsDelivered: false,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.orderNotifications.deliverOrderNotificationEvent, {
      eventKey,
      orderId: args.orderId,
      event: args.event,
      cancellationReason: args.cancellationReason,
      trackingInfo: args.trackingInfo,
    });

    console.info(
      `[notifications] queued event=${args.event} orderId=${args.orderId} eventKey=${eventKey}`
    );

    return { emitted: true, eventKey };
  },
});

export const deliverOrderNotificationEvent = internalAction({
  args: {
    eventKey: v.string(),
    orderId: v.id("orders"),
    event: orderNotificationEventValidator,
    cancellationReason: v.optional(v.string()),
    trackingInfo: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.runQuery(internal.orderNotifications.getOrderForDelivery, {
      orderId: args.orderId,
    });

    if (!order) {
      console.warn(
        `[notifications] skipped delivery — order missing event=${args.event} eventKey=${args.eventKey}`
      );
      return null;
    }

    const copy = buildOrderNotificationCopy(args.event, order.orderNumber, {
      cancellationReason: args.cancellationReason,
      trackingInfo: args.trackingInfo,
    });
    const deepLinkPath = buildOrderDeepLinkPath(order.orderNumber, args.event);
    const channels = getChannelsForEvent(args.event);
    const preferences = await ctx.runQuery(
      internal.orderNotifications.getPreferencesForDelivery,
      { customerEmail: order.customerEmail }
    );

    const channelsAttempted: string[] = [];
    let pushDelivered = false;
    let emailDelivered = false;
    let smsDelivered = false;
    let pushFailureReason: string | undefined;

    if (channels.includes("push") && shouldSendPushForEvent(args.event, preferences)) {
      channelsAttempted.push("push");
      const pushResult = await ctx.runAction(
        internal.orderNotifications.deliverPushForOrderEvent,
        {
          customerEmail: order.customerEmail,
          title: copy.title,
          body: copy.body,
          event: args.event,
          orderId: args.orderId,
          orderNumber: order.orderNumber,
          deepLinkPath,
        }
      );
      pushDelivered = pushResult.delivered;
      pushFailureReason = pushResult.failureReason;
    }

    if (channels.includes("email")) {
      channelsAttempted.push("email");
      if (
        args.event === "order.created" ||
        args.event === "payment.succeeded"
      ) {
        try {
          await ctx.runAction(internal.email.sendOrderConfirmation, {
            orderId: args.orderId,
          });
          emailDelivered = true;
        } catch (error) {
          console.error(
            `[notifications] email failed event=${args.event} orderId=${args.orderId}`,
            error
          );
        }
      } else if (args.event === "order.recovery.reminder") {
        try {
          await ctx.runAction(internal.email.sendPaymentRecoveryEmail, {
            orderId: args.orderId,
          });
          emailDelivered = true;
        } catch (error) {
          console.error(
            `[notifications] recovery email failed orderId=${args.orderId}`,
            error
          );
        }
      }
    }

    if (channels.includes("sms")) {
      channelsAttempted.push("sms");
      try {
        await ctx.runAction(internal.sms.sendOrderConfirmationSms, {
          orderId: args.orderId,
        });
        smsDelivered = true;
      } catch (error) {
        console.error(
          `[notifications] sms failed event=${args.event} orderId=${args.orderId}`,
          error
        );
      }
    }

    await ctx.runMutation(internal.orderNotifications.recordDeliveryResult, {
      eventKey: args.eventKey,
      channelsAttempted,
      pushDelivered,
      emailDelivered,
      smsDelivered,
      pushFailureReason,
    });

    await ctx.runMutation(internal.inAppNotifications.createInAppNotification, {
      customerEmail: order.customerEmail,
      type: args.event,
      title: copy.title,
      body: copy.body,
      orderId: args.orderId,
      orderNumber: order.orderNumber,
      deepLinkPath,
    });

    console.info(
      `[notifications] delivered event=${args.event} orderId=${args.orderId} push=${pushDelivered} email=${emailDelivered} sms=${smsDelivered}`
    );

    return null;
  },
});

export const getOrderForDelivery = internalQuery({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    return {
      orderNumber: order.orderNumber,
      customerEmail: order.customerEmail,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
    };
  },
});

export const getPreferencesForDelivery = internalQuery({
  args: {
    customerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    return await getNotificationPreferencesForEmail(ctx, args.customerEmail);
  },
});

export const recordDeliveryResult = internalMutation({
  args: {
    eventKey: v.string(),
    channelsAttempted: v.array(v.string()),
    pushDelivered: v.boolean(),
    emailDelivered: v.boolean(),
    smsDelivered: v.boolean(),
    pushFailureReason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("notificationEvents")
      .withIndex("by_event_key", (q) => q.eq("eventKey", args.eventKey))
      .unique();

    if (!row) {
      return null;
    }

    await ctx.db.patch(row._id, {
      channelsAttempted: args.channelsAttempted,
      pushDelivered: args.pushDelivered,
      emailDelivered: args.emailDelivered,
      smsDelivered: args.smsDelivered,
      pushFailureReason: args.pushFailureReason,
    });

    return null;
  },
});

export const deliverPushForOrderEvent = internalAction({
  args: {
    customerEmail: v.string(),
    title: v.string(),
    body: v.string(),
    event: orderNotificationEventValidator,
    orderId: v.id("orders"),
    orderNumber: v.string(),
    deepLinkPath: v.string(),
  },
  returns: v.object({
    delivered: v.boolean(),
    failureReason: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ delivered: boolean; failureReason?: string }> => {
    const tokens: Array<{
      expoPushToken: string;
    }> = await ctx.runQuery(internal.pushNotificationsInternal.getActiveTokensForEmail, {
      customerEmail: args.customerEmail,
    });

    if (tokens.length === 0) {
      return {
        delivered: false,
        failureReason: "no_active_tokens",
      };
    }

    const messages: Array<{
      to: string;
      title: string;
      body: string;
      sound: string;
      channelId: string;
      data: Record<string, string>;
    }> = tokens.map((token) => ({
      to: token.expoPushToken,
      title: args.title,
      body: args.body,
      sound: "default",
      channelId: "order-updates",
      data: {
        type: "order.notification",
        event: args.event,
        orderId: args.orderId,
        orderNumber: args.orderNumber,
        deepLinkPath: args.deepLinkPath,
      },
    }));

    const result: {
      sentCount: number;
      invalidTokens: string[];
      errors: string[];
    } = await ctx.runAction(internal.pushNotifications.sendPushMessages, {
      messages,
    });

    if (result.invalidTokens.length > 0) {
      await ctx.runAction(internal.pushNotifications.deactivateInvalidPushTokens, {
        expoPushTokens: result.invalidTokens,
      });
    }

    console.info(
      `[notifications] push event=${args.event} orderId=${args.orderId} devices=${tokens.length} sent=${result.sentCount}`
    );

    if (result.sentCount > 0) {
      return { delivered: true };
    }

    return {
      delivered: false,
      failureReason: result.errors[0] ?? "push_delivery_failed",
    };
  },
});
