import { httpAction } from "./_generated/server";
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

export const n8nRecommendationHealth = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const stats = await ctx.runQuery(internal.recommendationQueries.getRecommendationStatsInternal, {});
  return json({ ok: true, stats });
});

export const n8nRecommendationDueJobs = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const jobs = await ctx.runQuery(internal.recommendationQueries.getDueRecommendationJobs, {
    limit,
  });
  return json({ jobs });
});

export const n8nRecommendationProcessDue = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");
  const jobs = await ctx.runQuery(internal.recommendationQueries.getDueRecommendationJobs, {
    limit,
  });

  for (const job of jobs) {
    await ctx.runAction(internal.recommendationActions.processRecommendationJob, {
      jobId: job._id,
    });
  }

  return json({ processed: jobs.length });
});

export const n8nRecommendationProcessJob = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as { jobId?: string };
  if (!body.jobId) return json({ error: "jobId required" }, 400);

  await ctx.runAction(internal.recommendationActions.processRecommendationJob, {
    jobId: body.jobId as Id<"recommendationJobs">,
  });

  return json({ ok: true });
});

export const n8nRecommendationSaveProfile = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as {
    identityType?: "visitor" | "customer";
    identityKey?: string;
    aiInterestSummary?: string;
    segments?: string[];
    embedding?: number[];
    embeddingProvider?: string;
    embeddingVersion?: string;
  };

  if (!body.identityType || !body.identityKey) {
    return json({ error: "identityType and identityKey required" }, 400);
  }

  await ctx.runMutation(internal.recommendationMutations.saveRecommendationProfile, {
    identityType: body.identityType,
    identityKey: body.identityKey,
    aiInterestSummary: body.aiInterestSummary,
    segments: body.segments,
    embedding: body.embedding,
    embeddingProvider: body.embeddingProvider,
    embeddingVersion: body.embeddingVersion,
  });

  return json({ ok: true });
});

export const n8nRecommendationSaveCache = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as {
    cacheKey?: string;
    sectionType?: string;
    productIds?: string[];
    scores?: number[];
    explanations?: string;
    source?: string;
    expiresAt?: number;
  };

  if (!body.cacheKey || !body.sectionType || !body.productIds || !body.scores) {
    return json({ error: "cacheKey, sectionType, productIds, scores required" }, 400);
  }

  await ctx.runMutation(internal.recommendationMutations.saveRecommendationCache, {
    cacheKey: body.cacheKey,
    sectionType: body.sectionType as never,
    productIds: body.productIds as Id<"products">[],
    scores: body.scores,
    explanations: body.explanations,
    source: (body.source ?? "personalized") as never,
    expiresAt: body.expiresAt ?? Date.now() + 24 * 60 * 60 * 1000,
  });

  return json({ ok: true });
});

export const n8nRecommendationReportFailure = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const body = (await request.json()) as { jobId?: string; error?: string };
  if (!body.jobId) return json({ error: "jobId required" }, 400);

  await ctx.runMutation(internal.recommendationMutations.markJobFailed, {
    jobId: body.jobId as Id<"recommendationJobs">,
    error: body.error ?? "n8n processing failed",
  });

  return json({ ok: true });
});

export const n8nRecommendationExportAudiences = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "500");
  const data = await ctx.runQuery(
    internal.recommendationQueries.exportMarketingAudiencesInternal,
    { limit }
  );
  return json(data);
});
