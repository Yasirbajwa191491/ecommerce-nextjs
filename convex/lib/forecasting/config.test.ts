import { describe, expect, it } from "vitest";
import {
  assertForecastSettingValue,
  parseForecastHorizon,
  parseForecastStrategy,
  resolveForecastAvailability,
} from "./config";
import { fillSalesDays, saleIsEligible, utcDateFromMillis, weeklyTotals } from "./eligibility";

describe("forecast settings", () => {
  it("defaults to disabled, 14 days, and auto", () => {
    expect(parseForecastHorizon(undefined)).toBe(14);
    expect(parseForecastStrategy(undefined)).toBe("auto");
    expect(() => assertForecastSettingValue("demand_forecast_horizon_days", "60")).toThrow(/7, 14, or 30/);
    expect(() => assertForecastSettingValue("demand_forecast_model_strategy", "auto")).not.toThrow();
    expect(() => assertForecastSettingValue("enable_demand_forecasting", "false")).not.toThrow();
  });

  it("requires every forecasting gate", () => {
    const ready = {
      adminEnabled: true,
      deploymentGate: true,
      exportGate: true,
      serviceConfigured: true,
      artifactReady: true,
      published: true,
    };
    expect(resolveForecastAvailability(ready).enabled).toBe(true);
    expect(resolveForecastAvailability({ ...ready, adminEnabled: false }).reason).toBe("admin_disabled");
    expect(resolveForecastAvailability({ ...ready, exportGate: false }).reason).toBe("export_gate");
    expect(resolveForecastAvailability({ ...ready, published: false }).reason).toBe("forecast_unpublished");
  });
});

describe("sales eligibility", () => {
  it("counts paid stripe and COD fulfillment and skips failures", () => {
    expect(saleIsEligible({ status: "confirmed", paymentStatus: "paid", paymentMethod: "stripe" })).toBe(true);
    expect(saleIsEligible({ status: "delivered", paymentStatus: "paid", paymentMethod: "cod" })).toBe(true);
    expect(saleIsEligible({ status: "pending", paymentStatus: "pending", paymentMethod: "cod" })).toBe(false);
    expect(saleIsEligible({ status: "refunded", paymentStatus: "refunded", paymentMethod: "stripe" })).toBe(false);
    expect(saleIsEligible({ status: "cancelled", paymentStatus: "paid", paymentMethod: "stripe" })).toBe(false);
  });

  it("uses UTC dates and fills missing days as labeled zeros", () => {
    expect(utcDateFromMillis(Date.parse("2026-01-02T23:30:00.000Z"))).toBe("2026-01-02");
    const sales = new Map([["2026-01-01", { units: 2, orders: new Set(["o1"]) }]]);
    const points = fillSalesDays(sales, "2026-01-01", "2026-01-02");
    expect(points[1]?.observation).toBe("zero_filled");
    expect(points[1]?.units).toBe(0);
    expect(weeklyTotals(["2026-01-01", "2026-01-02"], [2, 3])[0]?.units).toBe(5);
  });
});
