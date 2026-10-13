import { describe, expect, it } from "vitest";

import { decodeScanCursor, paginateMatching } from "./indexedScan";

function arrayLoader(items: string[], batchSize: number) {
  return async (opts: { numItems: number; cursor: string | null }) => {
    const start = opts.cursor ? Number(opts.cursor) : 0;
    const size = Math.min(opts.numItems, batchSize);
    const page = items.slice(start, start + size);
    const next = start + page.length;
    return {
      page,
      isDone: next >= items.length,
      continueCursor: String(next),
    };
  };
}

describe("indexed scan pagination", () => {
  it("ignores legacy numeric cursors", () => {
    expect(decodeScanCursor("24")).toEqual({ cursor: null, offset: 0 });
  });

  it("returns only matches and resumes inside a batch", async () => {
    const items = ["a1", "b1", "a2", "b2", "a3", "c1"];
    const load = arrayLoader(items, 4);
    const first = await paginateMatching(
      load,
      { numItems: 2, cursor: null },
      (item) => item.startsWith("a")
    );
    expect(first.page).toEqual(["a1", "a2"]);
    expect(first.isDone).toBe(false);

    const second = await paginateMatching(
      load,
      { numItems: 2, cursor: first.continueCursor },
      (item) => item.startsWith("a")
    );
    expect(second.page).toEqual(["a3"]);
    expect(second.isDone).toBe(true);
  });

  it("does not restart from the beginning when the cursor advances", async () => {
    const items = Array.from({ length: 12 }, (_, index) => `p${index}`);
    const seen: string[] = [];
    const first = await paginateMatching(
      arrayLoader(items, 5),
      { numItems: 3, cursor: null },
      (item) => {
        seen.push(item);
        return true;
      }
    );
    expect(first.page).toEqual(["p0", "p1", "p2"]);
    const second = await paginateMatching(
      arrayLoader(items, 5),
      { numItems: 3, cursor: first.continueCursor },
      () => true
    );
    expect(second.page).toEqual(["p3", "p4", "p5"]);
  });
});
