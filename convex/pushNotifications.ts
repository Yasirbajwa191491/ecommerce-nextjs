"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type ExpoPushTicket =
  | { status: "ok"; id?: string }
  | { status: "error"; message?: string; details?: { error?: string } };

type ExpoPushResponse = {
  data?: ExpoPushTicket[];
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export const sendPushMessages = internalAction({
  args: {
    messages: v.array(
      v.object({
        to: v.string(),
        title: v.string(),
        body: v.string(),
        data: v.optional(v.any()),
        sound: v.optional(v.string()),
        channelId: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    sentCount: v.number(),
    invalidTokens: v.array(v.string()),
    errors: v.array(v.string()),
  }),
  handler: async (_ctx, args) => {
    if (args.messages.length === 0) {
      return { sentCount: 0, invalidTokens: [], errors: [] };
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    };

    const accessToken = process.env.EXPO_ACCESS_TOKEN?.trim();
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const invalidTokens: string[] = [];
    const errors: string[] = [];
    let sentCount = 0;

    const batchSize = 100;
    for (let i = 0; i < args.messages.length; i += batchSize) {
      const batch = args.messages.slice(i, i + batchSize);
      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(batch),
        });

        if (!response.ok) {
          const text = await response.text();
          errors.push(`Expo push HTTP ${response.status}: ${text.slice(0, 200)}`);
          continue;
        }

        const payload = (await response.json()) as ExpoPushResponse;
        const tickets = payload.data ?? [];

        for (let index = 0; index < tickets.length; index += 1) {
          const ticket = tickets[index];
          const token = batch[index]?.to;
          if (!ticket || !token) continue;

          if (ticket.status === "ok") {
            sentCount += 1;
            continue;
          }

          const errorCode = ticket.details?.error ?? ticket.message ?? "unknown";
          errors.push(`${token}: ${errorCode}`);

          if (
            errorCode === "DeviceNotRegistered" ||
            errorCode === "InvalidCredentials" ||
            errorCode === "MessageTooBig"
          ) {
            invalidTokens.push(token);
          }
        }
      } catch (error) {
        errors.push(
          error instanceof Error ? error.message : "Unknown Expo push error"
        );
      }
    }

    return { sentCount, invalidTokens, errors };
  },
});

export const deactivateInvalidPushTokens = internalAction({
  args: {
    expoPushTokens: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    for (const token of args.expoPushTokens) {
      await ctx.runMutation(internal.pushNotificationsInternal.deactivateToken, {
        expoPushToken: token,
      });
    }
    return null;
  },
});
