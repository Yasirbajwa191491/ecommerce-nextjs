import { describe, expect, it } from "vitest";
import {
  ragAssistantState,
  ragAssistantVisible,
  safeCitationHref,
  visibleCitations,
  type RagAskView,
} from "./assistant";

const answered: RagAskView = {
  status: "answered",
  answer: "The lamp has an oak finish.",
  citations: [
    {
      sourceType: "product",
      sourceId: "p1",
      productId: "p1",
      title: "Cedar Desk Lamp",
      section: "Specifications",
      url: "/product/p1",
    },
    {
      sourceType: "shipping_policy",
      sourceId: "shipping",
      productId: null,
      title: "Shipping Policy",
      section: "Shipping Policy",
      url: "/shipping",
    },
    {
      sourceType: "product",
      sourceId: "x",
      productId: "x",
      title: "Bad",
      section: "",
      url: "https://evil.example/phish",
    },
  ],
  products: [{ id: "p1", name: "Cedar Desk Lamp", url: "/product/p1" }],
  intent: "product_specifications",
};

describe("rag assistant view", () => {
  it("stays hidden while the feature is disabled", () => {
    expect(ragAssistantVisible(false)).toBe(false);
    expect(ragAssistantVisible(undefined)).toBe(false);
    expect(
      ragAssistantState({ enabled: false, loading: false, error: false, result: answered })
    ).toBe("hidden");
  });

  it("shows an answer with product and policy links", () => {
    expect(ragAssistantState({ enabled: true, loading: false, error: false, result: answered })).toBe(
      "answered"
    );
    expect(safeCitationHref("/product/p1")).toBe("/product/p1");
    expect(safeCitationHref("/shipping")).toBe("/shipping");
    expect(visibleCitations(answered.citations).map((item) => item.url)).toEqual([
      "/product/p1",
      "/shipping",
    ]);
  });

  it("reports empty and error states", () => {
    expect(
      ragAssistantState({
        enabled: true,
        loading: false,
        error: false,
        result: { ...answered, status: "empty", answer: "Nothing matched." },
      })
    ).toBe("empty");
    expect(ragAssistantState({ enabled: true, loading: false, error: true, result: null })).toBe(
      "error"
    );
    expect(ragAssistantState({ enabled: true, loading: true, error: false, result: null })).toBe(
      "loading"
    );
  });
});
