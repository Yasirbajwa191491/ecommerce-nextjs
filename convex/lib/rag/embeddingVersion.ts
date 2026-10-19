export type StoredChunk = {
  chunkId: string;
  contentHash: string;
  embeddingVersion: string;
};

/**
 * Re-embed when the chunk is new, its content hash changed, or the embedding
 * model version changed. A truthy stored version is not enough to skip.
 */
export function chunkNeedsReembedding(
  existing: StoredChunk | undefined,
  contentHash: string,
  targetEmbeddingVersion: string | null
): boolean {
  if (!existing) return true;
  if (existing.contentHash !== contentHash) return true;
  if (!targetEmbeddingVersion) return true;
  if (existing.embeddingVersion !== targetEmbeddingVersion) return true;
  return false;
}

export function selectChunksToReembed<T extends { chunkId: string; contentHash: string }>(
  prepared: T[],
  existing: StoredChunk[],
  targetEmbeddingVersion: string | null
): T[] {
  return prepared.filter((chunk) => {
    const match = existing.find((row) => row.chunkId === chunk.chunkId);
    return chunkNeedsReembedding(match, chunk.contentHash, targetEmbeddingVersion);
  });
}

export function vectorsCompatible(vectors: number[][], dimensions: number): boolean {
  return vectors.every((vector) => vector.length === dimensions);
}
