import { describe, expect, it } from "vitest";

import { getSiteUrl, requiresHttpsSiteUrl } from "./siteUrl";

describe("getSiteUrl", () => {
  it("falls back to localhost in non-production", () => {
    expect(getSiteUrl({})).toBe("http://localhost:3000");
    expect(getSiteUrl({ SITE_URL: "http://localhost:3000" })).toBe(
      "http://localhost:3000"
    );
  });

  it("detects production Convex deployments", () => {
    expect(requiresHttpsSiteUrl({ CONVEX_DEPLOYMENT: "prod:hip-salamander-864" })).toBe(
      true
    );
    expect(requiresHttpsSiteUrl({ CONVEX_DEPLOYMENT: "dev:local-dev" })).toBe(false);
    expect(requiresHttpsSiteUrl({ REQUIRE_HTTPS_SITE_URL: "1" })).toBe(true);
  });

  it("rejects missing or non-HTTPS SITE_URL on production", () => {
    expect(() =>
      getSiteUrl({ CONVEX_DEPLOYMENT: "prod:hip-salamander-864" })
    ).toThrow(/SITE_URL must be set/);
    expect(() =>
      getSiteUrl({
        CONVEX_DEPLOYMENT: "prod:hip-salamander-864",
        SITE_URL: "http://example.com",
      })
    ).toThrow(/must use HTTPS/);
    expect(() =>
      getSiteUrl({
        CONVEX_DEPLOYMENT: "prod:hip-salamander-864",
        SITE_URL: "https://localhost:3000",
      })
    ).toThrow(/must not be localhost/);
  });

  it("accepts HTTPS production SITE_URL", () => {
    expect(
      getSiteUrl({
        CONVEX_DEPLOYMENT: "prod:hip-salamander-864",
        SITE_URL: "https://yourstore.com/",
      })
    ).toBe("https://yourstore.com/");
  });
});
