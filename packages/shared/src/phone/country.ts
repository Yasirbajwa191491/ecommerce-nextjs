import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import { ENGLISH_COUNTRY_NAMES } from "./country-names";

export type PhoneCountryCode = CountryCode;

/** Used when locale/timezone cannot be mapped to a calling-code country. */
export const FALLBACK_PHONE_COUNTRY: PhoneCountryCode = "PK";

const COUNTRY_SET = new Set<string>(getCountries());

export type PhoneCountryOption = {
  code: PhoneCountryCode;
  callingCode: string;
  name: string;
  flag: string;
};

export function isPhoneCountryCode(value: string | undefined): value is PhoneCountryCode {
  return Boolean(value && COUNTRY_SET.has(value));
}

export function countryFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return "";
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0))
  );
}

function intlRegionName(code: string, locale: string): string | undefined {
  try {
    const display = new Intl.DisplayNames([locale], { type: "region" }).of(code);
    if (!display || display.toUpperCase() === code.toUpperCase()) return undefined;
    return display;
  } catch {
    return undefined;
  }
}

function countryName(code: PhoneCountryCode, locale = "en"): string {
  const language = locale.toLowerCase().split("-")[0] ?? "en";
  if (language !== "en") {
    const localized = intlRegionName(code, locale);
    if (localized) return localized;
  }
  return ENGLISH_COUNTRY_NAMES[code] ?? intlRegionName(code, "en") ?? code;
}

let cachedCountries: PhoneCountryOption[] | null = null;

export function listPhoneCountries(locale = "en"): PhoneCountryOption[] {
  if (cachedCountries && locale === "en") {
    return cachedCountries;
  }

  const options = getCountries()
    .map((code) => ({
      code,
      callingCode: `+${getCountryCallingCode(code)}`,
      name: countryName(code, locale),
      flag: countryFlagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (locale === "en") {
    cachedCountries = options;
  }

  return options;
}

function regionToCountry(region: string | undefined): PhoneCountryCode | undefined {
  if (!region) return undefined;
  const code = region.trim().toUpperCase();
  return isPhoneCountryCode(code) ? code : undefined;
}

export function countryFromLocale(locale?: string): PhoneCountryCode | undefined {
  if (!locale?.trim()) return undefined;

  try {
    const parsed = new Intl.Locale(locale);
    const region = parsed.region ?? parsed.maximize().region;
    const fromRegion = regionToCountry(region);
    if (fromRegion) return fromRegion;
  } catch {
    // Fall through to the trailing-region regex.
  }

  const match = /[-_]([A-Za-z]{2})(?:$|[-_])/.exec(locale.trim());
  return regionToCountry(match?.[1]);
}

/** Common IANA zones → ISO country. Location proxy when GPS is not used. */
const TIMEZONE_COUNTRY: Record<string, PhoneCountryCode> = {
  "Africa/Cairo": "EG",
  "Africa/Casablanca": "MA",
  "Africa/Johannesburg": "ZA",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
  "America/Anchorage": "US",
  "America/Argentina/Buenos_Aires": "AR",
  "America/Bogota": "CO",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Halifax": "CA",
  "America/Los_Angeles": "US",
  "America/Mexico_City": "MX",
  "America/New_York": "US",
  "America/Phoenix": "US",
  "America/Santiago": "CL",
  "America/Sao_Paulo": "BR",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Asia/Almaty": "KZ",
  "Asia/Baghdad": "IQ",
  "Asia/Bangkok": "TH",
  "Asia/Colombo": "LK",
  "Asia/Dhaka": "BD",
  "Asia/Dubai": "AE",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Hong_Kong": "HK",
  "Asia/Jakarta": "ID",
  "Asia/Jerusalem": "IL",
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuwait": "KW",
  "Asia/Manila": "PH",
  "Asia/Muscat": "OM",
  "Asia/Qatar": "QA",
  "Asia/Riyadh": "SA",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Singapore": "SG",
  "Asia/Tehran": "IR",
  "Asia/Tokyo": "JP",
  "Asia/Yangon": "MM",
  "Atlantic/Reykjavik": "IS",
  "Australia/Melbourne": "AU",
  "Australia/Perth": "AU",
  "Australia/Sydney": "AU",
  "Europe/Amsterdam": "NL",
  "Europe/Athens": "GR",
  "Europe/Berlin": "DE",
  "Europe/Brussels": "BE",
  "Europe/Bucharest": "RO",
  "Europe/Budapest": "HU",
  "Europe/Copenhagen": "DK",
  "Europe/Dublin": "IE",
  "Europe/Helsinki": "FI",
  "Europe/Istanbul": "TR",
  "Europe/Lisbon": "PT",
  "Europe/London": "GB",
  "Europe/Madrid": "ES",
  "Europe/Moscow": "RU",
  "Europe/Oslo": "NO",
  "Europe/Paris": "FR",
  "Europe/Prague": "CZ",
  "Europe/Rome": "IT",
  "Europe/Stockholm": "SE",
  "Europe/Vienna": "AT",
  "Europe/Warsaw": "PL",
  "Europe/Zurich": "CH",
  "Pacific/Auckland": "NZ",
  "Pacific/Honolulu": "US",
};

export function countryFromTimeZone(timeZone?: string): PhoneCountryCode | undefined {
  if (!timeZone?.trim()) return undefined;
  const exact = TIMEZONE_COUNTRY[timeZone];
  if (exact) return exact;

  const zoneCity = timeZone.split("/").pop();
  if (!zoneCity) return undefined;

  for (const [zone, country] of Object.entries(TIMEZONE_COUNTRY)) {
    if (zone.endsWith(`/${zoneCity}`)) {
      return country;
    }
  }

  return undefined;
}

export function getDefaultPhoneCountry(options?: {
  locale?: string;
  timeZone?: string;
}): PhoneCountryCode {
  return detectLocationCountry(options) ?? FALLBACK_PHONE_COUNTRY;
}

/** Timezone, then locale. Undefined when neither maps to a country. */
export function detectLocationCountry(options?: {
  locale?: string;
  timeZone?: string;
}): PhoneCountryCode | undefined {
  return countryFromTimeZone(options?.timeZone) ?? countryFromLocale(options?.locale);
}

function runtimeLocaleAndTimeZone(): { locale?: string; timeZone?: string } {
  const resolved =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions()
      : undefined;

  const nav =
    typeof navigator !== "undefined"
      ? navigator.languages?.find((locale) => countryFromLocale(locale)) ??
        navigator.language
      : undefined;

  return {
    locale: nav ?? resolved?.locale,
    timeZone: resolved?.timeZone,
  };
}

export function detectRuntimePhoneCountry(): PhoneCountryCode {
  return detectLocationCountry(runtimeLocaleAndTimeZone()) ?? FALLBACK_PHONE_COUNTRY;
}

/** Full country name for a stored code or name. "PK" and "Pakistan" both become "Pakistan". */
export function resolveCountryDisplayName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (isPhoneCountryCode(upper)) {
    return countryName(upper);
  }

  const match = listPhoneCountries().find(
    (country) => country.name.toLowerCase() === trimmed.toLowerCase()
  );
  return match?.name ?? trimmed;
}

/** Delivery country from the device timezone or locale, without the phone-number fallback. */
export function detectCheckoutCountryName(): string | undefined {
  const code = detectLocationCountry(runtimeLocaleAndTimeZone());
  return code ? countryName(code) : undefined;
}

export function normalizePhoneToE164(
  phone: string,
  defaultCountry: PhoneCountryCode = FALLBACK_PHONE_COUNTRY
): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";

  const parsed =
    parsePhoneNumberFromString(trimmed) ??
    parsePhoneNumberFromString(trimmed, defaultCountry);

  if (parsed?.isValid()) {
    return parsed.format("E.164");
  }

  return trimmed;
}

export function isValidE164Phone(phone: string): boolean {
  const parsed = parsePhoneNumberFromString(phone.trim());
  return Boolean(parsed?.isValid());
}
