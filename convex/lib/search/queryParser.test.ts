import { describe, expect, it } from "vitest";
import { parseSearchQuery } from "./queryParser";

describe("search intent parsing", () => {
  it("preserves the exact recorded shoe request and its USD budget", () => {
    expect(parseSearchQuery("Find me running shoes under $100")).toMatchObject({ maxPrice: 100, currency: "USD", embeddingQuery: "Find me running shoes", productTypeTerms: expect.arrayContaining(["shoe"]) });
  });
  it.each([
    ["phones under PKR 70,000", "PKR", 70000],
    ["phones below 70,000 rupees", "PKR", 70000],
    ["phones up to Rs. 70,000", "PKR", 70000],
    ["headphones under€99.99", "EUR", 99.99],
    ["laptops max GBP 900", "GBP", 900],
    ["phones cheaper than 300 dollars", "USD", 300],
  ])("parses %s without relabeling its currency", (query, currency, maxPrice) => {
    expect(parseSearchQuery(query)).toMatchObject({ currency, maxPrice });
  });
  it("preserves lower budget and review thresholds", () => {
    expect(parseSearchQuery("laptops at least USD 400 with good reviews")).toMatchObject({ currency: "USD", minPrice: 400, minStars: 4 });
  });
  it("does not mistake headphones for a phone category substring", () => {
    expect(parseSearchQuery("headphones", [{ name: "Phone", slug: "phone" }]).categoryHint).toBeUndefined();
  });
  it("leaves mixed-currency browsing unconstrained without a budget", () => {
    const result = parseSearchQuery("Apple");
    expect(result.currency).toBeUndefined();
    expect(result.minPrice).toBeUndefined();
    expect(result.maxPrice).toBeUndefined();
  });
});
