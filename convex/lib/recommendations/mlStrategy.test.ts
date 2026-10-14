import { describe, expect, it } from "vitest";
import {
  assertMlStrategySetting,
  parseRecommendationStrategy,
  sectionUsesContentModel,
} from "./mlStrategy";

describe("recommendation strategy", () => {
  it("defaults missing and unknown values to convex", () => {
    expect(parseRecommendationStrategy(undefined)).toBe("convex");
    expect(parseRecommendationStrategy("")).toBe("convex");
    expect(parseRecommendationStrategy("hybrid")).toBe("convex");
    expect(parseRecommendationStrategy(" python_content ")).toBe("python_content");
  });

  it("rejects unsupported strategy writes", () => {
    expect(() => assertMlStrategySetting("recommendation_strategy", "hybrid")).toThrow(
      /convex or python_content/
    );
    expect(() => assertMlStrategySetting("recommendation_strategy_fallback", "python_content")).toThrow(
      /fallback must be convex/
    );
    expect(() => assertMlStrategySetting("recommendation_python_model_version", "content-v2")).toThrow(
      /content-v1/
    );
    expect(() => assertMlStrategySetting("recommendation_strategy", "convex")).not.toThrow();
  });

  it("uses the content model only for product-anchored similar sections", () => {
    expect(sectionUsesContentModel("because_you_viewed", "prod_1")).toBe(true);
    expect(sectionUsesContentModel("recommended_alternatives", "prod_1")).toBe(true);
    expect(sectionUsesContentModel("recommended_for_you", "prod_1")).toBe(false);
    expect(sectionUsesContentModel("because_you_viewed", undefined)).toBe(false);
  });
});
