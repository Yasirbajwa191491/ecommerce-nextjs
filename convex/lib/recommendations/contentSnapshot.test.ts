import { describe, expect, it } from "vitest";
import {
  cleanupTargets,
  publishBlockReason,
  resolvePrecomputedRecommendations,
  snapshotCreateError,
  snapshotIsStale,
  validateImportRows,
} from "./contentSnapshot";

const created = {
  snapshotId: "snap-catalog-01",
  modelVersion: "content-v1",
  artifactVersion: "content-v1-abc123def456",
  datasetFingerprint: "a".repeat(64),
  datasetSource: "real_catalog" as const,
  expectedProductCount: 2,
  topK: 8,
  generatedAt: 1_700_000_000_000,
};

describe("content recommendation snapshots", () => {
  it("rejects an incomplete snapshot and keeps the published id out of cleanup", () => {
    expect(publishBlockReason({ status: "staging", storedProductCount: 1, expectedProductCount: 2 })).toBe(
      "Snapshot is incomplete"
    );
    expect(publishBlockReason({ status: "published", storedProductCount: 2, expectedProductCount: 2 })).toBe(
      "Only a staging snapshot can be published"
    );
    expect(
      cleanupTargets(
        [
          { snapshotId: "snap-live", status: "published" },
          { snapshotId: "snap-old", status: "archived" },
          { snapshotId: "snap-bad", status: "failed" },
          { snapshotId: "snap-work", status: "staging" },
        ],
        new Set(["snap-live"])
      )
    ).toEqual(["snap-old", "snap-bad"]);
  });

  it("validates a bounded import batch", () => {
    expect(snapshotCreateError(created)).toBeNull();
    expect(
      validateImportRows(
        [
          {
            productId: "prod-a",
            recommendedProductIds: ["prod-b", "prod-b"],
            scores: [0.4, 0.2],
          },
        ],
        8
      )
    ).toBe("Invalid recommendation target");
    expect(
      validateImportRows(
        [{ productId: "prod-a", recommendedProductIds: ["prod-a"], scores: [1] }],
        8
      )
    ).toBe("Invalid recommendation target");
  });

  it("filters inactive, deleted, duplicate, and self recommendations", () => {
    const resolved = resolvePrecomputedRecommendations({
      strategy: "python_content",
      limit: 2,
      sourceProductId: "prod-a",
      row: {
        recommendedProductIds: ["prod-a", "prod-b", "prod-b", "prod-c", "prod-d"],
        scores: [0.9, 0.8, 0.7, 0.6, 0.5],
      },
      activeProductIds: new Set(["prod-b", "prod-d"]),
    });
    expect(resolved).toEqual({
      applied: true,
      products: [
        { productId: "prod-b", score: 0.8 },
        { productId: "prod-d", score: 0.5 },
      ],
    });
  });

  it("falls back when the strategy is convex or the snapshot row is empty", () => {
    expect(
      resolvePrecomputedRecommendations({
        strategy: "convex",
        limit: 8,
        sourceProductId: "prod-a",
        row: { recommendedProductIds: ["prod-b"], scores: [0.5] },
        activeProductIds: new Set(["prod-b"]),
      }).applied
    ).toBe(false);
    expect(
      resolvePrecomputedRecommendations({
        strategy: "python_content",
        limit: 8,
        sourceProductId: "prod-a",
        row: null,
        activeProductIds: new Set(["prod-b"]),
      }).applied
    ).toBe(false);
    expect(
      resolvePrecomputedRecommendations({
        strategy: "python_content",
        limit: 8,
        sourceProductId: "prod-a",
        row: { recommendedProductIds: ["prod-gone"], scores: [0.5] },
        activeProductIds: new Set(),
      }).applied
    ).toBe(false);
  });

  it("marks an old snapshot stale from the caller clock", () => {
    expect(snapshotIsStale(1_000, 1_000 + 25 * 60 * 60 * 1000, 24)).toBe(true);
    expect(snapshotIsStale(1_000, 1_000 + 60 * 60 * 1000, 24)).toBe(false);
  });
});
