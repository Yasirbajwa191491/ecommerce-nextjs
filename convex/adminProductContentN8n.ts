"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import {
  productContentContextValidator,
  productContentModeValidator,
  productContentResultValidator,
  type ProductContentResult,
} from "./lib/ai/productContentTypes";
import {
  isProductContentN8nConfigured,
  isProductContentN8nEnabled,
} from "./lib/ai/featureFlags";

const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_SINGLE_MS = 90_000;
const POLL_TIMEOUT_ALL_MS = 180_000;

function pollTimeoutForMode(mode: string): number {
  return mode === "all" ? POLL_TIMEOUT_ALL_MS : POLL_TIMEOUT_SINGLE_MS;
}

function formatN8nFailureMessage(error: string | undefined): string {
  if (!error) {
    return "Product content generation failed via n8n. Check n8n workflow logs.";
  }
  const lower = error.toLowerCase();
  if (lower.includes("429")) {
    return "AI provider rate limit (429). Configure multiple providers in n8n (Groq, OpenRouter, OpenAI) or retry later.";
  }
  return error;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJobResult(resultJson: string): ProductContentResult {
  return JSON.parse(resultJson) as ProductContentResult;
}

export const generateProductContentN8nAction = action({
  args: {
    mode: productContentModeValidator,
    context: productContentContextValidator,
  },
  returns: productContentResultValidator,
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.lib.adminAuth.requireAdminQuery, {});

    if (!isProductContentN8nEnabled()) {
      throw new Error(
        "n8n product content generation is disabled. Set PRODUCT_CONTENT_N8N_ENABLED=true in Convex."
      );
    }
    if (!isProductContentN8nConfigured()) {
      throw new Error(
        "N8N_REVIEW_WEBHOOK_URL is not configured. Activate workflow 01 in n8n and set the webhook URL in Convex."
      );
    }

    if (args.mode === "altText") {
      throw new Error(
        "Alt text generation requires Gemini vision. Switch to Gemini mode for alt text."
      );
    }

    if (!args.context.name.trim()) {
      throw new Error("Product name is required for content generation");
    }
    if (!args.context.categoryName.trim()) {
      throw new Error("Category is required for content generation");
    }

    const session: { adminUserId: string } = await ctx.runQuery(
      internal.aiBusinessCopilotQueries.getAdminSession,
      {}
    );

    const requestId = `product-content:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;

    await ctx.runMutation(internal.productContentJobs.createJob, {
      requestId,
      mode: args.mode,
      context: JSON.stringify(args.context),
      triggeredBy: session.adminUserId,
    });

    await ctx.runAction(internal.n8nWebhooks.emitReviewEvent, {
      event: "product.ai.generate_content",
      payload: JSON.stringify({
        requestId,
        mode: args.mode,
        context: args.context,
        triggeredBy: session.adminUserId,
      }),
    });

    const startedAt = Date.now();
    const pollTimeoutMs = pollTimeoutForMode(args.mode);
    while (Date.now() - startedAt < pollTimeoutMs) {
      const job = await ctx.runQuery(
        internal.productContentJobs.getJobByRequestId,
        { requestId }
      );

      if (!job) {
        throw new Error("Product content job disappeared unexpectedly");
      }

      if (job.status === "completed" && job.result) {
        const result = parseJobResult(job.result);

        if (args.mode === "description" && !result.description) {
          throw new Error("Failed to generate product description");
        }
        if (
          args.mode === "seo" &&
          !result.seoTitle &&
          !result.seoDescription
        ) {
          throw new Error("Failed to generate SEO content");
        }
        if (args.mode === "highlights" && !result.highlights?.length) {
          throw new Error("Failed to generate product highlights");
        }
        if (
          args.mode === "all" &&
          !result.description &&
          !result.seoTitle &&
          !result.highlights?.length
        ) {
          throw new Error("Failed to generate product content");
        }

        return result;
      }

      if (job.status === "failed") {
        throw new Error(formatN8nFailureMessage(job.error));
      }

      await sleep(POLL_INTERVAL_MS);
    }

    await ctx.runMutation(internal.productContentJobs.failJob, {
      requestId,
      error: "Timed out waiting for n8n product content generation",
    });

    throw new Error(
      `Timed out waiting for n8n product content generation (${Math.round(pollTimeoutMs / 1000)}s). Check workflow 01 is active and CONVEX_SITE_URL in n8n.`
    );
  },
});
