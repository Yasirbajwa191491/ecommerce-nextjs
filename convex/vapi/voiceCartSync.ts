import { mutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { conversationForBrowser } from "./browserSession";

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
    browserSessionToken: v.string(),
    lines: v.array(browserCartLineValidator),
  },
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx, args): Promise<PushBrowserCartToVoiceResult> => {
    const callId = args.vapiCallId.trim();
    if (!callId || args.lines.length === 0) {
      return { updated: false };
    }

    const conversation = await conversationForBrowser(ctx, callId, args.browserSessionToken);

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
