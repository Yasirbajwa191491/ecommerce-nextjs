import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { validateN8nSecret } from "./lib/n8nAuth";
import { sanitizeProductContentResult } from "./lib/ai/productContentGeneration";
import type {
  ProductContentMode,
  ProductContentResult,
} from "./lib/ai/productContentTypes";

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

type CompleteBody = {
  requestId?: string;
  result?: ProductContentResult;
  provider?: string;
  model?: string;
  durationMs?: number;
};

type FailureBody = {
  requestId?: string;
  error?: string;
  provider?: string;
  model?: string;
  durationMs?: number;
};

function resolveN8nMode(mode: ProductContentMode): ProductContentMode {
  return mode === "all" ? "all" : mode;
}

function getImageCountFromContext(contextJson: string): number {
  try {
    const parsed = JSON.parse(contextJson) as { imageUrls?: string[] };
    return parsed.imageUrls?.filter((u) => u.trim()).length ?? 0;
  } catch {
    return 0;
  }
}

function optionalString(value: string | null | undefined): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const n8nProductContentComplete = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as CompleteBody;
  if (!body.requestId || !body.result) {
    return json({ error: "requestId and result are required" }, 400);
  }

  const job = await ctx.runQuery(internal.productContentJobs.getJobByRequestId, {
    requestId: body.requestId,
  });
  if (!job) {
    return json({ error: "Job not found" }, 404);
  }

  const sanitized = sanitizeProductContentResult(
    resolveN8nMode(job.mode),
    body.result,
    getImageCountFromContext(job.context)
  );

  await ctx.runMutation(internal.productContentJobs.completeJob, {
    requestId: body.requestId,
    result: JSON.stringify(sanitized),
    provider: optionalString(body.provider),
    model: optionalString(body.model),
  });

  return json({ ok: true, durationMs: body.durationMs });
});

export const n8nProductContentReportFailure = httpAction(async (ctx, request) => {
  if (!validateN8nSecret(request)) return unauthorized();

  const body = (await request.json()) as FailureBody;
  if (!body.requestId) {
    return json({ error: "requestId is required" }, 400);
  }

  await ctx.runMutation(internal.productContentJobs.failJob, {
    requestId: body.requestId,
    error: body.error ?? "Product content generation failed",
    provider: optionalString(body.provider),
    model: optionalString(body.model),
  });

  return json({ ok: true, durationMs: body.durationMs });
});
