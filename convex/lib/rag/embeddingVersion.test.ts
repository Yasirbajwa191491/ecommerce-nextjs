import { describe, expect, it } from "vitest";
import { chunkNeedsReembedding, selectChunksToReembed, vectorsCompatible } from "./embeddingVersion";

describe("RAG embedding versions", () => {
  it("re-embeds when the provider version changes", () => {
    const existing = {
      chunkId: "c1",
      contentHash: "hash",
      embeddingVersion: "openai:384",
    };
    expect(chunkNeedsReembedding(existing, "hash", "google:384")).toBe(true);
    expect(chunkNeedsReembedding(existing, "hash", "openai:384")).toBe(false);
  });

  it("skips unchanged content and version, and recovers a partial set", () => {
    const prepared = [
      { chunkId: "keep", contentHash: "a" },
      { chunkId: "change", contentHash: "b2" },
      { chunkId: "new", contentHash: "c" },
    ];
    const existing = [
      { chunkId: "keep", contentHash: "a", embeddingVersion: "openai:384" },
      { chunkId: "change", contentHash: "b1", embeddingVersion: "openai:384" },
    ];
    const selected = selectChunksToReembed(prepared, existing, "openai:384");
    expect(selected.map((chunk) => chunk.chunkId)).toEqual(["change", "new"]);
    expect(vectorsCompatible([[1, 2]], 2)).toBe(true);
    expect(vectorsCompatible([[1, 2], [1]], 2)).toBe(false);
  });

  it("does not skip when the target version is unknown", () => {
    expect(
      chunkNeedsReembedding(
        { chunkId: "c1", contentHash: "hash", embeddingVersion: "openai:384" },
        "hash",
        null
      )
    ).toBe(true);
  });
});
