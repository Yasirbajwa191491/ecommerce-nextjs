import { describe, expect, it } from "vitest";
import {
  assertSnapshotDate,
  claimDecision,
  classifyOrder,
  gapRate,
  insufficientHistory,
  lineIncluded,
  observeDay,
  qualityNote,
  toQualityLine,
  withinCutoff,
} from "./dataQuality";

describe("forecast data quality", () => {
  it("classifies paid sales, refunds, and gifts", () => {
    expect(classifyOrder({ status: "confirmed", paymentStatus: "paid", paymentMethod: "stripe" })).toBe(
      "eligible"
    );
    expect(classifyOrder({ status: "refunded", paymentStatus: "refunded", paymentMethod: "stripe" })).toBe(
      "refund"
    );
    expect(lineIncluded("eligible", false)).toBe(true);
    expect(lineIncluded("eligible", true)).toBe(false);
    expect(lineIncluded("refund", false)).toBe(false);
  });

  it("is idempotent and respects a stable cutoff", () => {
    expect(claimDecision(false)).toBe("insert");
    expect(claimDecision(true)).toBe("skip");
    expect(withinCutoff("2026-01-02", "2026-01-03")).toBe(true);
    expect(withinCutoff("2026-01-04", "2026-01-03")).toBe(false);
    const once = observeDay(undefined, "2026-01-01", 2);
    const again = observeDay(once, "2026-01-01", 2);
    expect(again.units).toBe(4);
    expect(again.observedDays).toBe(1);
    const next = observeDay(again, "2026-01-03", 1);
    expect(next.observedDays).toBe(2);
    expect(gapRate(next)).toBeCloseTo(1 - 2 / 3);
    expect(insufficientHistory(3)).toBe(true);
    expect(insufficientHistory(14)).toBe(false);
  });

  it("does not backfill stock history or copy customer fields", () => {
    expect(() => assertSnapshotDate("2026-01-01", "2026-01-02")).toThrow(/backfilled/);
    expect(() => assertSnapshotDate("2026-01-02", "2026-01-02")).not.toThrow();
    const line = toQualityLine({
      lineKey: "item1",
      orderKey: "order1",
      productId: "product1",
      categoryId: "cat",
      quantity: 1,
      date: "2026-01-01",
      customerEmail: "a@example.com",
      customerPhone: "555",
      customerAddress: "secret",
    });
    expect(line).not.toHaveProperty("customerEmail");
    expect(JSON.stringify(line)).not.toContain("example.com");
    expect(qualityNote(false)).toMatch(/not complete history/);
    expect(qualityNote(true)).toMatch(/does not fill missing days/);
  });
});
