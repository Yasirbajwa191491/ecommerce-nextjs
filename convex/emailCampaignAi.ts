"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  generateEmailCampaign,
  generateCtaOptions,
  generateProductPromoText,
  optimizeEmailSubject,
} from "./lib/ai/emailCampaignGeneration";
import {
  campaignPresetValidator,
  generateCampaignResultValidator,
  subjectOptimizationResultValidator,
} from "./lib/ai/emailCampaignTypes";

function requireGeminiKey(): void {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your Convex environment."
    );
  }
}

export const generateCampaign = action({
  args: {
    preset: campaignPresetValidator,
    customPrompt: v.optional(v.string()),
    categorySlug: v.optional(v.string()),
    categoryName: v.optional(v.string()),
    minDiscountPercent: v.optional(v.number()),
  },
  returns: generateCampaignResultValidator,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    requireGeminiKey();

    const context = await ctx.runQuery(
      internal.emailCampaignAiQueries.getGenerationContext,
      {}
    );

    const discountedProducts = await ctx.runQuery(
      internal.emailCampaignAiQueries.getDiscountedProductsForCampaign,
      {
        categorySlug: args.categorySlug,
        minDiscountPercent: args.minDiscountPercent ?? 1,
        limit: 20,
      }
    );

    const activePromotions = await ctx.runQuery(
      internal.emailCampaignAiQueries.getActivePromotionsForCampaign,
      { now: Date.now(), limit: 10 }
    );

    const result = await generateEmailCampaign({
      preset: args.preset,
      customPrompt: args.customPrompt,
      categorySlug: args.categorySlug,
      categoryName: args.categoryName,
      minDiscountPercent: args.minDiscountPercent,
      context,
      discountedProducts,
      activePromotions,
    });

    return {
      campaignName: result.campaignName,
      subject: result.subject,
      headline: result.headline,
      previewText: result.previewText,
      bodyParagraphs: result.bodyParagraphs,
      ctaText: result.ctaText,
      productPromoText: result.productPromoText,
      suggestedProductIds: result.suggestedProductIds as string[],
      suggestedSegmentKeys: result.suggestedSegmentKeys,
    };
  },
});

export const optimizeSubjectLine = action({
  args: {
    subject: v.string(),
    campaignName: v.optional(v.string()),
  },
  returns: subjectOptimizationResultValidator,
  handler: async (ctx, args): Promise<{
    highOpen: string;
    short: string;
    promotional: string;
  }> => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    requireGeminiKey();

    const context = await ctx.runQuery(
      internal.emailCampaignAiQueries.getGenerationContext,
      {}
    );

    return await optimizeEmailSubject({
      subject: args.subject,
      campaignName: args.campaignName,
      storeName: context.storeName,
    });
  },
});

export const generateCta = action({
  args: {
    campaignName: v.optional(v.string()),
    subject: v.optional(v.string()),
  },
  returns: v.object({ options: v.array(v.string()) }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    requireGeminiKey();

    const context = await ctx.runQuery(
      internal.emailCampaignAiQueries.getGenerationContext,
      {}
    );

    const options = await generateCtaOptions({
      campaignName: args.campaignName,
      subject: args.subject,
      storeName: context.storeName,
    });

    return { options };
  },
});

export const generateProductPromo = action({
  args: {
    productIds: v.array(v.id("products")),
  },
  returns: v.object({ productPromoText: v.string() }),
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});
    requireGeminiKey();

    const context = await ctx.runQuery(
      internal.emailCampaignAiQueries.getGenerationContext,
      {}
    );

    const summaries = await ctx.runQuery(
      internal.emailCampaignAiQueries.getProductsForPromo,
      { productIds: args.productIds }
    );

    const productPromoText = await generateProductPromoText({
      products: summaries,
      storeName: context.storeName,
    });

    return { productPromoText };
  },
});
