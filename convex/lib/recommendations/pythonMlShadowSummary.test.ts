import { describe, expect, it } from "vitest";
import { parseNeuralShadowSummary } from "./pythonMlShadowSummary";

describe("neural shadow summary", () => {
  it("stays unavailable until a neural shadow block is recorded", () => {
    const missing = parseNeuralShadowSummary("{}");
    expect(missing.recorded).toBe(false);
    expect(missing.modelAvailable).toBe(false);
    expect(missing.modelVersion).toBeNull();
    expect(missing.evaluationWarning).toMatch(/not customer/i);

    const recorded = parseNeuralShadowSummary(
      JSON.stringify({
        strategies: {
          neural: {
            modelAvailable: true,
            modelVersion: "neural-v1",
            trainedAt: "2024-02-01T00:00:00+00:00",
            datasetFingerprint: "abc",
            scoreKind: "product_embedding_cosine",
            validationLoss: 0.42,
            fallbackCount: 1,
            latencyMs: 12,
            validCandidateCount: 4,
            overlapAtK: 0.25,
            rankAgreement: 0.1,
            errorCode: null,
          },
        },
      })
    );
    expect(recorded.recorded).toBe(true);
    expect(recorded.modelVersion).toBe("neural-v1");
    expect(recorded.validationLoss).toBe(0.42);
    expect(recorded.overlapAtK).toBe(0.25);
    expect(JSON.stringify(recorded)).not.toMatch(/visitor/i);
  });
});
