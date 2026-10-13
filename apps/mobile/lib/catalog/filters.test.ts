import { describe, expect, it } from "vitest";
import { DEFAULT_CATALOG_FILTERS, toFacetArgs, toPublicFilterArgs } from "./filters";

describe("catalog query contracts", () => {
  it("passes selected currency and price limits without converting them", () => {
    expect(toPublicFilterArgs({ ...DEFAULT_CATALOG_FILTERS, currency: "PKR", minPrice: 60000, maxPrice: 80000 }, 100)).toMatchObject({ currency: "PKR", minPrice: 60000, maxPrice: 80000 });
  });
  it("preserves an empty hybrid result scope so facets cannot show the entire catalog", () => {
    expect(toFacetArgs(DEFAULT_CATALOG_FILTERS, 100, { isHybridSearch: true, hybridProductIds: [] }).productIds).toEqual([]);
  });
});
