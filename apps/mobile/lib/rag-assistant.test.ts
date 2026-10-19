import { describe, expect, it } from "vitest";
import { ragAssistantState, safeCitationHref } from "../../../packages/shared/src/rag/assistant";

describe("mobile rag assistant states", () => {
  it("hides the assistant until the server enables it", () => {
    expect(ragAssistantState({ enabled: false, loading: false, error: false, result: null })).toBe(
      "hidden"
    );
  });

  it("keeps product and policy links and drops external urls", () => {
    expect(safeCitationHref("/product/abc")).toBe("/product/abc");
    expect(safeCitationHref("/return")).toBe("/return");
    expect(safeCitationHref("https://example.com")).toBeNull();
    expect(
      ragAssistantState({
        enabled: true,
        loading: false,
        error: false,
        result: {
          status: "empty",
          answer: "No records.",
          citations: [],
          products: [],
          intent: "product_discovery",
        },
      })
    ).toBe("empty");
    expect(ragAssistantState({ enabled: true, loading: false, error: true, result: null })).toBe(
      "error"
    );
  });
});
