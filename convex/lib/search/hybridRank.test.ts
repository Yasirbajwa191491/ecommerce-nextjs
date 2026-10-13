import { describe, expect, it } from "vitest";

import { applyHardSearchConstraints, isRelevantSearchCandidate, tokenizeQuery, type SearchProductCandidate } from "./hybridRank";
import { parseSearchQuery } from "./queryParser";

function candidate(overrides: Partial<SearchProductCandidate> & Pick<SearchProductCandidate, "_id" | "price" | "stars">): SearchProductCandidate {
  return {
    name: overrides._id,
    company: "Brand",
    discountPercent: 0,
    currency: "USD",
    reviews: 4,
    featured: false,
    categoryId: "cat",
    categoryName: "Shoes",
    keywords: [],
    popularityScore: 0,
    ...overrides,
  };
}

describe("hard search constraints", () => {
  it("keeps budget and rating filters on fallback candidates", () => {
    const ranked = [
      candidate({ _id: "cheap", price: 40, stars: 4.5 }),
      candidate({ _id: "expensive", price: 400, stars: 5 }),
      candidate({ _id: "low-rated", price: 30, stars: 2 }),
    ];
    expect(
      applyHardSearchConstraints(ranked, { maxPrice: 100, minStars: 4 }).map(
        (product) => product._id
      )
    ).toEqual(["cheap"]);
  });

  it("never turns the recorded shoes request into electronics even with strong semantic scores", () => {
    const parsed = parseSearchQuery("Find me running shoes under $100");
    const unrelated = [candidate({ _id: "airpods", name: "Apple Airpods", categoryName: "Electronics", price: 80, stars: 5 }), candidate({ _id: "desk", name: "Office desk", categoryName: "Furniture", price: 90, stars: 5 })];
    expect(applyHardSearchConstraints(unrelated, parsed)).toEqual([]);
  });

  it("compares budgets only in the requested currency and uses discounted prices", () => {
    const products = [candidate({ _id: "usd-shoe", name: "Running shoes", price: 120, discountPercent: 25, stars: 4 }), candidate({ _id: "pkr-shoe", name: "Running shoes", currency: "PKR", price: 90, stars: 4 }), candidate({ _id: "over-budget", name: "Running shoes", price: 150, stars: 4 })];
    expect(applyHardSearchConstraints(products, { currency: "USD", maxPrice: 100, productTypeTerms: ["shoe"] }).map((product) => product._id)).toEqual(["usd-shoe"]);
  });

  it("keeps mixed currencies when there is no price or currency constraint", () => {
    const products = [candidate({ _id: "usd", price: 300, stars: 4 }), candidate({ _id: "pkr", currency: "PKR", price: 70000, stars: 4 })];
    expect(applyHardSearchConstraints(products, {})).toHaveLength(2);
  });

  it("does not trust hallucinated keywords for an explicit product type", () => {
    const product = candidate({ _id: "chair", name: "Office chair", categoryName: "Furniture", price: 50, stars: 4, keywords: ["running shoes"] });
    expect(applyHardSearchConstraints([product], { productTypeTerms: ["shoe"] })).toEqual([]);
  });

  it("rejects weak positive semantic scores and ignores conversational filler", () => {
    const product = candidate({ _id: "desk", name: "Office desk", categoryName: "Furniture", price: 90, stars: 4 });
    const terms = tokenizeQuery("Find me running shoes please");
    expect(terms).toEqual(["running", "shoes"]);
    expect(isRelevantSearchCandidate(product, terms, 0.2)).toBe(false);
  });

  it("excludes unreviewed products from a rating threshold", () => {
    const product = candidate({ _id: "unreviewed", price: 80, stars: 5, reviews: 0 });
    expect(applyHardSearchConstraints([product], { minStars: 4 })).toEqual([]);
  });
});
