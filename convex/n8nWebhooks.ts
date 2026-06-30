"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const emitReviewEvent = internalAction({
  args: {
    event: v.string(),
    payload: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args) => {
    const url = process.env.N8N_REVIEW_WEBHOOK_URL;
    const secret = process.env.N8N_WEBHOOK_SECRET;
    const required = args.event.startsWith("product.ai.");

    if (!url) {
      if (required) {
        throw new Error(
          "N8N_REVIEW_WEBHOOK_URL is not configured in Convex."
        );
      }
      return null;
    }

    try {
      const parsedPayload = JSON.parse(args.payload) as Record<string, unknown>;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(secret ? { "X-N8N-Secret": secret } : {}),
        },
        body: JSON.stringify({
          event: args.event,
          timestamp: Date.now(),
          ...parsedPayload,
        }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const message = `n8n webhook failed (${response.status}): ${text || response.statusText}`;
        if (required) {
          throw new Error(message);
        }
        console.error("[n8n] Failed to emit event:", args.event, message);
      }
    } catch (error) {
      if (required) {
        throw error;
      }
      console.error("[n8n] Failed to emit review event:", args.event, error);
    }

    return null;
  },
});
