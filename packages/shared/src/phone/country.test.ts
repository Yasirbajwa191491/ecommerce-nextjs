import { describe, expect, it } from "vitest";

import {
  FALLBACK_PHONE_COUNTRY,
  countryFromLocale,
  countryFromTimeZone,
  detectLocationCountry,
  getDefaultPhoneCountry,
  isValidE164Phone,
  normalizePhoneToE164,
  resolveCountryDisplayName,
} from "./country";

describe("phone country detection", () => {
  it("maps browser locale regions", () => {
    expect(countryFromLocale("en-US")).toBe("US");
    expect(countryFromLocale("ur-PK")).toBe("PK");
    expect(countryFromLocale("en-GB")).toBe("GB");
  });

  it("prefers timezone (location) over locale", () => {
    expect(
      getDefaultPhoneCountry({ locale: "en-US", timeZone: "Asia/Karachi" })
    ).toBe("PK");
    expect(countryFromTimeZone("America/New_York")).toBe("US");
  });

  it("falls back when location cannot be inferred", () => {
    expect(getDefaultPhoneCountry({})).toBe(FALLBACK_PHONE_COUNTRY);
    expect(detectLocationCountry({})).toBeUndefined();
  });
});

describe("checkout country names", () => {
  it("shows the full country name for a stored code", () => {
    expect(resolveCountryDisplayName("PK")).toBe("Pakistan");
    expect(resolveCountryDisplayName("pk")).toBe("Pakistan");
    expect(resolveCountryDisplayName("US")).toBe("United States");
  });

  it("keeps an already selected country name", () => {
    expect(resolveCountryDisplayName("Pakistan")).toBe("Pakistan");
    expect(resolveCountryDisplayName(" united states ")).toBe("United States");
  });

  it("leaves an empty country blank", () => {
    expect(resolveCountryDisplayName("")).toBe("");
    expect(resolveCountryDisplayName("   ")).toBe("");
  });

  it("still shows the country name when the device only returns the code", () => {
    const original = Intl.DisplayNames;
    Intl.DisplayNames = class {
      of(code: string) {
        return String(code);
      }
    } as unknown as typeof Intl.DisplayNames;

    try {
      expect(resolveCountryDisplayName("PK")).toBe("Pakistan");
      expect(resolveCountryDisplayName("AE")).toBe("United Arab Emirates");
    } finally {
      Intl.DisplayNames = original;
    }
  });
});

describe("phone E.164 normalization", () => {
  it("keeps valid international numbers", () => {
    expect(normalizePhoneToE164("+923001234567")).toBe("+923001234567");
    expect(isValidE164Phone("+923001234567")).toBe(true);
  });

  it("applies the selected country to local numbers", () => {
    expect(normalizePhoneToE164("03001234567", "PK")).toBe("+923001234567");
  });

  it("rejects numbers without a country as invalid E.164", () => {
    expect(isValidE164Phone("03001234567")).toBe(false);
  });
});
