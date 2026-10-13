import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { computeFilterFacets, filterCatalogProducts, sortCatalogProducts, type CatalogProduct, type PromotionIndex } from "./catalogFilters";

function product(id: string, currency: string, price: number, overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return { _id: id as Id<"products">, categoryId: "category" as Id<"productCategories">, name: id, company: "Brand", currency, price, colors: [], stock: 5, stars: 4.5, reviews: 10, active: true, ...overrides };
}
const promotions: PromotionIndex = new Map();

describe("currency-aware catalog", () => {
  const products = [product("usd", "USD", 300), product("pkr", "PKR", 70000)];
  it("retains both currencies without a selected currency", () => {
    expect(filterCatalogProducts(products, {}, promotions)).toHaveLength(2);
  });
  it("scopes numeric price limits to their selected currency", () => {
    expect(filterCatalogProducts(products, { currency: "PKR", maxPrice: 80000 }, promotions).map((item) => item._id)).toEqual(["pkr"]);
  });
  it("does not apply a legacy dollar budget to raw rupee prices", () => {
    expect(filterCatalogProducts(products, { maxPrice: 100000 }, promotions).map((item) => item._id)).toEqual(["usd"]);
  });
  it("sorts mixed amounts in currency groups instead of comparing them as equivalent units", () => {
    const sorted = sortCatalogProducts([product("usd-expensive", "USD", 300), product("usd-cheap", "USD", 200), product("pkr-expensive", "PKR", 70000), product("pkr-cheap", "PKR", 65000)], "lowest");
    expect(sorted.map((item) => item._id)).toEqual(["pkr-cheap", "pkr-expensive", "usd-cheap", "usd-expensive"]);
  });
  it("counts each rating threshold and excludes unreviewed items", () => {
    const facets = computeFilterFacets([product("five", "USD", 100, { stars: 5 }), product("four", "USD", 100, { stars: 4 }), product("unreviewed", "USD", 100, { stars: 5, reviews: 0 })], promotions, {});
    expect(facets.ratingBuckets.slice(0, 2)).toEqual([{ minRating: 5, label: "5 Stars", count: 1 }, { minRating: 4, label: "4 Stars & Up", count: 2 }]);
  });
});
