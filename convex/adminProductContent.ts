"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { generateProductContent } from "./lib/ai/productContentGeneration";
import {
  productContentContextValidator,
  productContentModeValidator,
  productContentResultValidator,
} from "./lib/ai/productContentTypes";

export const generateProductContentAction = action({
  args: {
    mode: productContentModeValidator,
    context: productContentContextValidator,
  },
  returns: productContentResultValidator,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});

    if (!process.env.GEMINI_API_KEY) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Set it in your Convex environment."
      );
    }

    return await generateProductContent(args.mode, args.context);
  },
});
