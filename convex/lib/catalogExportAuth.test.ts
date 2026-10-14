import { describe, expect, it } from "vitest";
import { bearerToken, catalogExportTokenMatches } from "./catalogExportAuth";

describe("catalog export authentication", () => {
  it("rejects a missing token and a mismatched bearer token", () => {
    expect(catalogExportTokenMatches("secret", undefined)).toBe(false);
    expect(catalogExportTokenMatches("", "secret")).toBe(false);
    expect(catalogExportTokenMatches("secret", "secret")).toBe(true);
    expect(catalogExportTokenMatches("secret", "secreT")).toBe(false);
    expect(catalogExportTokenMatches("secret-extra", "secret")).toBe(false);
    expect(bearerToken("Bearer secret")).toBe("secret");
    expect(bearerToken("Basic secret")).toBe("");
  });
});
