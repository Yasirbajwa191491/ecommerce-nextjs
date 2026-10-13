import { describe, expect, it } from "vitest";

import { mergeSearchPage } from "./pageMerge";

describe("search page generation", () => {
  it("drops a stale pagination response after the query changes", () => {
    const merged = mergeSearchPage({
      requestId: 1,
      currentRequestId: 2,
      mode: "append",
      previous: ["beta"],
      incoming: ["alpha-page-2"],
    });
    expect(merged).toEqual({ products: ["beta"], applied: false });
  });

  it("appends a page from the current query", () => {
    const merged = mergeSearchPage({
      requestId: 2,
      currentRequestId: 2,
      mode: "append",
      previous: ["beta"],
      incoming: ["beta-2"],
    });
    expect(merged.products).toEqual(["beta", "beta-2"]);
  });
});
