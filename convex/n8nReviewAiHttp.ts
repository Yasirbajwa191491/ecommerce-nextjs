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
  return json(stats);
});

export const n8nQueueHealth = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const stats = await ctx.runQuery(internal.reviewAiQueueMutations.getQueueStats, {});
  return json(stats);
});
