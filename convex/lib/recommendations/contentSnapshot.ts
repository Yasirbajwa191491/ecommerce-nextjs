export const MAX_SNAPSHOT_BATCH = 20;
export const MAX_STORED_RECOMMENDATIONS = 16;
export const CLEANUP_ITEM_BATCH = 25;

const SNAPSHOT_ID_PATTERN = /^[a-zA-Z0-9_-]{8,80}$/;
const FINGERPRINT_PATTERN = /^[a-f0-9]{64}$/;

export type SnapshotStatus = "staging" | "published" | "failed" | "archived";

export type SnapshotCreateInput = {
  snapshotId: string;
  modelVersion: string;
  artifactVersion: string;
  datasetFingerprint: string;
  datasetSource: "synthetic" | "real_catalog";
  expectedProductCount: number;
  topK: number;
  generatedAt: number;
};

export type ImportRow = {
  productId: string;
  recommendedProductIds: string[];
  scores: number[];
};

export type PrecomputedRow = {
  recommendedProductIds: string[];
  scores: number[];
};

export type RankedRecommendation = {
  productId: string;
  score: number;
};

export function snapshotCreateError(input: SnapshotCreateInput): string | null {
  if (!SNAPSHOT_ID_PATTERN.test(input.snapshotId)) return "Snapshot id is invalid";
  if (input.modelVersion !== "content-v1") return "Model version must be content-v1";
  if (!input.artifactVersion.startsWith("content-v1") || input.artifactVersion.length > 80) {
    return "Artifact version is invalid";
  }
  if (!FINGERPRINT_PATTERN.test(input.datasetFingerprint)) return "Dataset fingerprint is invalid";
  if (input.datasetSource !== "synthetic" && input.datasetSource !== "real_catalog") {
    return "Dataset source is invalid";
  }
  if (!Number.isInteger(input.expectedProductCount) || input.expectedProductCount < 1) {
    return "Snapshot does not cover any products";
  }
  if (input.expectedProductCount > 100_000) return "Snapshot is too large";
  if (
    !Number.isInteger(input.topK) ||
    input.topK < 1 ||
    input.topK > MAX_STORED_RECOMMENDATIONS
  ) {
    return "topK must be between 1 and 16";
  }
  if (!Number.isFinite(input.generatedAt) || input.generatedAt <= 0) {
    return "generatedAt is invalid";
  }
  return null;
}

export function validateImportRows(rows: ImportRow[], topK: number): string | null {
  if (rows.length < 1 || rows.length > MAX_SNAPSHOT_BATCH) {
    return "Batch size must be between 1 and 20";
  }
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.productId || seen.has(row.productId)) return "Duplicate or missing source product";
    seen.add(row.productId);
    if (row.recommendedProductIds.length !== row.scores.length) {
      return "Scores do not match recommendations";
    }
    if (row.recommendedProductIds.length > topK) return "Too many recommendations";
    const targets = new Set<string>();
    for (let index = 0; index < row.recommendedProductIds.length; index += 1) {
      const productId = row.recommendedProductIds[index];
      const score = row.scores[index];
      if (!productId || productId === row.productId || targets.has(productId)) {
        return "Invalid recommendation target";
      }
      if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) {
        return "Invalid recommendation score";
      }
      targets.add(productId);
    }
  }
  return null;
}

export function publishBlockReason(snapshot: {
  status: SnapshotStatus;
  storedProductCount: number;
  expectedProductCount: number;
}): string | null {
  if (snapshot.status !== "staging") return "Only a staging snapshot can be published";
  if (snapshot.expectedProductCount < 1) return "Snapshot does not cover any products";
  if (snapshot.storedProductCount !== snapshot.expectedProductCount) {
    return "Snapshot is incomplete";
  }
  return null;
}

export function cleanupTargets(
  snapshots: Array<{ snapshotId: string; status: SnapshotStatus }>,
  publishedSnapshotIds: ReadonlySet<string>
): string[] {
  return snapshots
    .filter((row) => !publishedSnapshotIds.has(row.snapshotId))
    .filter((row) => row.status === "archived" || row.status === "failed")
    .map((row) => row.snapshotId);
}

export function resolvePrecomputedRecommendations(input: {
  strategy: "convex" | "python_content";
  limit: number;
  sourceProductId: string;
  row: PrecomputedRow | null;
  activeProductIds: ReadonlySet<string>;
}): { applied: boolean; products: RankedRecommendation[] } {
  if (input.strategy !== "python_content" || input.row === null) {
    return { applied: false, products: [] };
  }
  if (input.row.recommendedProductIds.length !== input.row.scores.length) {
    return { applied: false, products: [] };
  }
  const limit = Math.min(MAX_STORED_RECOMMENDATIONS, Math.max(1, Math.floor(input.limit)));
  const products: RankedRecommendation[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < input.row.recommendedProductIds.length; index += 1) {
    const productId = input.row.recommendedProductIds[index];
    const score = input.row.scores[index];
    if (!productId || productId === input.sourceProductId || seen.has(productId)) continue;
    if (!input.activeProductIds.has(productId)) continue;
    if (typeof score !== "number" || !Number.isFinite(score)) {
      return { applied: false, products: [] };
    }
    seen.add(productId);
    products.push({ productId, score });
    if (products.length >= limit) break;
  }
  if (products.length === 0) return { applied: false, products: [] };
  return { applied: true, products };
}

export function snapshotIsStale(generatedAt: number, now: number, refreshHours: number): boolean {
  const windowMs = Math.max(1, refreshHours) * 60 * 60 * 1000;
  return now - generatedAt > windowMs;
}

export function clampRecommendationLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return 8;
  return Math.min(MAX_STORED_RECOMMENDATIONS, Math.max(1, Math.floor(limit)));
}
