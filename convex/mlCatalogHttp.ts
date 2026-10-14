import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { bearerToken, catalogExportTokenMatches } from "./lib/catalogExportAuth";
import { clampCatalogPageSize } from "./lib/recommendations/catalogExport";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorize(request: Request): Response | null {
  const expected = process.env.CATALOG_EXPORT_TOKEN;
  if (!expected) return json({ error: "Catalog export is not configured" }, 503);
  const provided = bearerToken(request.headers.get("Authorization"));
  if (!catalogExportTokenMatches(provided, expected)) return json({ error: "Unauthorized" }, 401);
  return null;
}

async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "JSON object is required" }, 400);
    }
    return body as Record<string, unknown>;
  } catch {
    return json({ error: "JSON object is required" }, 400);
  }
}

export const exportCatalog = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const limit = Number(url.searchParams.get("limit") ?? "50");
  try {
    const page = await ctx.runQuery(internal.contentRecommendations.exportCatalogPage, {
      paginationOpts: {
        numItems: clampCatalogPageSize(limit),
        cursor: cursor && cursor.length > 0 ? cursor : null,
      },
    });
    return json(page);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Catalog export failed";
    return json({ error: message }, 400);
  }
});

export const createSnapshot = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const parsed = await readJson(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as {
    snapshotId?: string;
    modelVersion?: string;
    artifactVersion?: string;
    datasetFingerprint?: string;
    datasetSource?: "synthetic" | "real_catalog";
    expectedProductCount?: number;
    topK?: number;
    generatedAt?: number;
  };
  if (!body.snapshotId || !body.modelVersion || !body.artifactVersion || !body.datasetFingerprint) {
    return json({ error: "Snapshot fields are required" }, 400);
  }
  if (body.datasetSource !== "synthetic" && body.datasetSource !== "real_catalog") {
    return json({ error: "Dataset source is invalid" }, 400);
  }
  try {
    const snapshotId = await ctx.runMutation(internal.contentRecommendations.createSnapshot, {
      snapshotId: body.snapshotId,
      modelVersion: body.modelVersion,
      artifactVersion: body.artifactVersion,
      datasetFingerprint: body.datasetFingerprint,
      datasetSource: body.datasetSource,
      expectedProductCount: body.expectedProductCount ?? 0,
      topK: body.topK ?? 0,
      generatedAt: body.generatedAt ?? 0,
    });
    return json({ snapshotId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Snapshot creation failed";
    return json({ error: message }, 400);
  }
});

export const appendSnapshot = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const parsed = await readJson(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as {
    snapshotId?: string;
    rows?: Array<{
      productId: string;
      recommendedProductIds: string[];
      scores: number[];
    }>;
  };
  if (!body.snapshotId || !body.rows) return json({ error: "snapshotId and rows are required" }, 400);
  try {
    const result = await ctx.runMutation(internal.contentRecommendations.appendBatch, {
      snapshotId: body.snapshotId,
      rows: body.rows.map((row) => ({
        productId: row.productId as Id<"products">,
        recommendedProductIds: row.recommendedProductIds as Id<"products">[],
        scores: row.scores,
      })),
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Snapshot import failed";
    return json({ error: message }, 400);
  }
});

export const publishSnapshot = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const parsed = await readJson(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as { snapshotId?: string };
  if (!body.snapshotId) return json({ error: "snapshotId is required" }, 400);
  try {
    const result = await ctx.runMutation(internal.contentRecommendations.publishSnapshot, {
      snapshotId: body.snapshotId,
    });
    return json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Snapshot publication failed";
    return json({ error: message }, 400);
  }
});

export const failSnapshot = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const parsed = await readJson(request);
  if (parsed instanceof Response) return parsed;
  const body = parsed as { snapshotId?: string; error?: string };
  if (!body.snapshotId || !body.error) {
    return json({ error: "snapshotId and error are required" }, 400);
  }
  try {
    const snapshotId = await ctx.runMutation(internal.contentRecommendations.failSnapshot, {
      snapshotId: body.snapshotId,
      error: body.error,
    });
    return json({ snapshotId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Snapshot failure update failed";
    return json({ error: message }, 400);
  }
});

export const snapshotStatus = httpAction(async (ctx, request) => {
  const rejected = authorize(request);
  if (rejected) return rejected;
  const url = new URL(request.url);
  const now = Number(url.searchParams.get("now") ?? "0");
  try {
    const status = await ctx.runQuery(internal.contentRecommendations.getStatusInternal, { now });
    return json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Status failed";
    return json({ error: message }, 400);
  }
});
