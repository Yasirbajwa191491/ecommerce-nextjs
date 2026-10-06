import { describe, expect, it } from "vitest";

import { applyHardSearchConstraints, type SearchProductCandidate } from "./hybridRank";

function candidate(overrides: Partial<SearchProductCandidate> & Pick<SearchProductCandidate, "_id" | "price" | "stars">): SearchProductCandidate {
  return {
    name: overrides._id,
    company: "Brand",
    discountPercent: 0,
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
});
