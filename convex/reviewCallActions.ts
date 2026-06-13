"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const placeOutboundCall = internalAction({
  args: { reviewCallId: v.id("review_calls") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(internal.reviewCalls.getOutboundPayload, {
      reviewCallId: args.reviewCallId,
    });

    if (!payload) {
      await ctx.runMutation(internal.reviewCalls.markCallFailed, {
        reviewCallId: args.reviewCallId,
        reason: "Invalid review call payload",
      });
      return null;
    }

    const apiKey = process.env.VAPI_API_KEY?.trim();
    const assistantId = process.env.VAPI_REVIEW_ASSISTANT_ID?.trim();
    const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID?.trim();

    if (!apiKey || !assistantId || !phoneNumberId) {
      await ctx.runMutation(internal.reviewCalls.markCallFailed, {
        reviewCallId: args.reviewCallId,
        reason:
          "Vapi not configured. Set VAPI_API_KEY, VAPI_REVIEW_ASSISTANT_ID, and VAPI_PHONE_NUMBER_ID in Convex env.",
      });
      return null;
    }

    const metadata = {
      type: "review_collection",
      reviewCallId: payload.reviewCallId,
      orderId: payload.orderId,
      customerEmail: payload.customerEmail,
      productIds: payload.productIds,
      orderNumber: payload.orderNumber,
    };

    try {
      const response = await fetch("https://api.vapi.ai/call/phone", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assistantId,
          phoneNumberId,
          customer: {
            number: payload.customerPhoneE164,
            name: payload.customerName,
            numberE164CheckEnabled: false,
          },
          assistantOverrides: {
            variableValues: {
              customerName: payload.customerName,
              orderNumber: payload.orderNumber,
              storeName: payload.storeName,
            },
            metadata,
          },
          metadata,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        id?: string;
        message?: string | string[];
        error?: string;
        errors?: Array<{ message?: string }>;
      };

      if (!response.ok || !data.id) {
        const messagePart = Array.isArray(data.message)
          ? data.message.join("; ")
          : data.message;
        const errorsPart = data.errors
          ?.map((entry) => entry.message)
          .filter(Boolean)
          .join("; ");
        const reason =
          messagePart ??
          errorsPart ??
          data.error ??
          `Vapi API error (${response.status})`;
        console.error("[reviewCall] Vapi outbound failed:", {
          status: response.status,
          body: data,
        });
        await ctx.runMutation(internal.reviewCalls.markCallFailed, {
          reviewCallId: args.reviewCallId,
          reason,
        });
        return null;
      }

      await ctx.runMutation(internal.reviewCalls.linkVapiCallId, {
        reviewCallId: args.reviewCallId,
        vapiCallId: data.id,
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Failed to place outbound call";
      await ctx.runMutation(internal.reviewCalls.markCallFailed, {
        reviewCallId: args.reviewCallId,
        reason,
      });
    }

    return null;
  },
});
