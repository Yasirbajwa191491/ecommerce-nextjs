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

export const n8nImageEmbeddingHealth = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const queueStats = await ctx.runQuery(
    internal.imageEmbeddingQueries.getQueueStatsInternal,
    {}
  );
  const providers = await ctx.runQuery(
    internal.providerHealthMutations.listAll,
    {}
  );

  return json({ queue: queueStats, providers });
});

export const n8nImageEmbeddingDueJobs = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");

  const jobs = await ctx.runQuery(internal.imageEmbeddingQueries.getDueJobs, {
    limit,
  });

  return json({ jobs });
});

export const n8nImageEmbeddingProcessDue = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? "10");

  const result = await ctx.runAction(
    internal.imageEmbeddingActions.processDueJobs,
    { limit }
  );

  return json(result);
});

export const n8nImageEmbeddingProcessJob = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as { jobId?: string };
  if (!body.jobId) return json({ error: "jobId required" }, 400);

  await ctx.runAction(internal.imageEmbeddingActions.processJobById, {
    jobId: body.jobId as Id<"imageEmbeddingJobs">,
  });

  return json({ ok: true });
});

type SaveBody = {
  jobId?: string;
  productId?: string;
  embedding?: number[];
  provider?: "siglip" | "clip";
  model?: string;
  contentHash?: string;
  error?: string;
};

export const n8nImageEmbeddingSave = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as SaveBody;
  if (!body.productId || !body.embedding || !body.provider || !body.contentHash) {
    return json({ error: "Missing required fields" }, 400);
  }

  await ctx.runMutation(internal.imageEmbeddingMutations.applyImageEmbedding, {
    productId: body.productId as Id<"products">,
    embedding: body.embedding,
    provider: body.provider,
    model: body.model ?? body.provider,
    contentHash: body.contentHash,
    jobId: body.jobId ? (body.jobId as Id<"imageEmbeddingJobs">) : undefined,
  });

  return json({ ok: true });
});

export const n8nImageEmbeddingReportFailure = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as SaveBody;
  if (!body.jobId) return json({ error: "jobId required" }, 400);

  await ctx.runMutation(
    internal.imageEmbeddingMutations.markImageEmbeddingJobFailed,
    {
      jobId: body.jobId as Id<"imageEmbeddingJobs">,
      error: body.error ?? "n8n processing failed",
    }
  );

  return json({ ok: true });
});
