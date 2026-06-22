import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

const browserCartLineValidator = v.object({
  productId: v.id("products"),
  color: v.string(),
  quantity: v.number(),
});

type PushBrowserCartToVoiceResult = {
  updated: boolean;
};

/** Push the browser cart into the active voice session so getCart matches the UI. */
export const pushBrowserCartToVoice = mutation({
  args: {
    vapiCallId: v.string(),
    lines: v.array(browserCartLineValidator),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args): Promise<PushBrowserCartToVoiceResult> => {
    const callId = args.vapiCallId.trim();
    if (!callId || args.lines.length === 0) {
      return { updated: false };
    }

    const conversation = await ctx.db
      .query("vapiConversations")
      .withIndex("by_vapi_call_id", (q) => q.eq("vapiCallId", callId))
      .unique();

    if (!conversation) {
      return { updated: false };
    }

    const result = await ctx.runMutation(
      internal.vapi.shoppingTools.mergeBrowserCartIntoVoice,
      {
        conversationId: conversation._id,
        lines: args.lines,
      }
    );

    return { updated: result.updated };
  },
});
