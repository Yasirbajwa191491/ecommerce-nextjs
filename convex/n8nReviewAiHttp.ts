import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { validateN8nSecret } from "./lib/n8nAuth";

function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type GenerationBody = {
  reviewId?: string;
  productId?: string;
  type?: string;
  content?: string;
  provider?: string;
  model?: string;
  source?: "automatic" | "manual" | "fallback";
  triggeredBy?: string;
  jobId?: string;
  durationMs?: number;
  mode?: "replace" | "version" | "history_only";
  applyToReview?: boolean;
  title?: string;
  error?: string;
};

export const n8nProcessJob = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as { jobId?: string };
  if (!body.jobId) {
    return json({ error: "jobId required" }, 400);
  }

  await ctx.runAction(internal.reviewAiQueueActions.processJobById, {
    jobId: body.jobId as Id<"reviewAiJobs">,
  });

  return json({ ok: true });
});

export const n8nProcessDue = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");

  const result = await ctx.runAction(internal.reviewAiQueueActions.processDueJobs, {
    limit,
  });

  return json(result);
});

export const n8nDueJobs = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");

  const jobs = await ctx.runQuery(internal.reviewAiQueueMutations.getDueJobs, {
    limit,
  });

  return json({ jobs });
});

export const n8nWeeklyStats = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const stats = await ctx.runQuery(internal.n8nReviewAi.getWeeklyStats, {});
  const aiMetrics = await ctx.runQuery(
    internal.reviewAiMetrics.getAggregatedMetrics,
    { days: 7 }
  );
  return json({ ...stats, aiMetrics });
});

export const n8nQueueHealth = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const stats = await ctx.runQuery(internal.reviewAiQueueMutations.getQueueStats, {});
  return json(stats);
});

export const n8nSaveGeneration = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as GenerationBody;
  if (!body.reviewId || !body.type || !body.content || !body.provider || !body.model) {
    return json(
      { error: "reviewId, type, content, provider, and model are required" },
      400
    );
  }

  let content = body.content;
  const review = body.title
    ? null
    : await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
        reviewId: body.reviewId as Id<"productReviews">,
      });

  const generationId = await ctx.runAction(
    internal.reviewAiN8nActions.saveGenerationWithEmbed,
    {
      reviewId: body.reviewId as Id<"productReviews">,
      productId: body.productId as Id<"products"> | undefined,
      type: body.type as
        | "sentiment"
        | "tags"
        | "moderation"
        | "reply"
        | "summary"
        | "topics"
        | "full_analysis",
      content,
      provider: body.provider,
      model: body.model,
      source: body.source ?? "fallback",
      triggeredBy: body.triggeredBy,
      jobId: body.jobId as Id<"reviewAiJobs"> | undefined,
      durationMs: body.durationMs,
      mode: body.mode,
      applyToReview: body.applyToReview,
      title: body.title ?? review?.title,
      reviewContent: review?.content,
    }
  );

  return json({ ok: true, generationId });
});

export const n8nReportFailure = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as GenerationBody;
  if (!body.reviewId || !body.type || !body.provider) {
    return json({ error: "reviewId, type, and provider are required" }, 400);
  }

  await ctx.runMutation(internal.reviewAiGenerations.saveGenerationFromN8n, {
    reviewId: body.reviewId as Id<"productReviews">,
    type: body.type as
      | "sentiment"
      | "tags"
      | "moderation"
      | "reply"
      | "summary"
      | "topics"
      | "full_analysis",
    content: JSON.stringify({ error: body.error ?? "Generation failed" }),
    provider: body.provider,
    model: body.model ?? "unknown",
    source: body.source ?? "fallback",
    triggeredBy: body.triggeredBy,
    jobId: body.jobId as Id<"reviewAiJobs"> | undefined,
    mode: "history_only",
    applyToReview: false,
  });

  await ctx.runMutation(internal.reviewAiMetrics.recordMetric, {
    provider: body.provider,
    type: body.type,
    success: false,
    isFallback: body.source === "fallback",
    durationMs: body.durationMs,
  });

  return json({ ok: true });
});

export const n8nGenerationStats = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? "30");

  const stats = await ctx.runQuery(internal.reviewAiMetrics.getAggregatedMetrics, {
    days,
  });

  return json(stats);
});

async function fetchReviewForGeneration(ctx: ActionCtx, reviewId: string) {
  const review = await ctx.runQuery(internal.reviewAiQueries.getReviewForAi, {
    reviewId: reviewId as Id<"productReviews">,
  });
  if (!review) return null;
  return review;
}

type ManualGenerateBody = {
  reviewId?: string;
  jobId?: string;
  mode?: string;
  triggeredBy?: string;
};

async function queueManualGeneration(
  ctx: ActionCtx,
  body: ManualGenerateBody,
  types: string[]
) {
  if (!body.reviewId) {
    return json({ error: "reviewId required" }, 400);
  }

  const review = await fetchReviewForGeneration(ctx, body.reviewId);
  if (!review) {
    return json({ error: "Review not found" }, 404);
  }

  const storeContext = await ctx.runQuery(
    internal.settings.getReviewReplyStoreContextQuery,
    {}
  );

  await ctx.scheduler.runAfter(0, internal.n8nWebhooks.emitReviewEvent, {
    event: "review.ai.manual_generate",
    payload: JSON.stringify({
      requestId: `${body.reviewId}:${Date.now()}`,
      reviewId: body.reviewId,
      jobId: body.jobId,
      types,
      source: "manual",
      regenerationMode: body.mode ?? "version",
      triggeredBy: body.triggeredBy ?? "n8n",
      storeContext,
      reviewText: {
        title: review.title,
        content: review.content,
        rating: review.rating,
        customerName: review.customerName,
      },
    }),
  });

  return json({ ok: true, queued: true });
}

export const n8nGenerateSentiment = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as ManualGenerateBody;
  return await queueManualGeneration(ctx, body, ["sentiment"]);
});

export const n8nGenerateTags = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as ManualGenerateBody;
  return await queueManualGeneration(ctx, body, ["tags"]);
});

export const n8nGenerateReply = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as ManualGenerateBody;
  return await queueManualGeneration(ctx, body, ["reply"]);
});

export const n8nGenerateSummary = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as ManualGenerateBody;
  return await queueManualGeneration(ctx, body, ["summary"]);
});

export const n8nReprocessReview = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as ManualGenerateBody;
  return await queueManualGeneration(ctx, body, [
    "sentiment",
    "tags",
    "moderation",
    "full_analysis",
  ]);
});
