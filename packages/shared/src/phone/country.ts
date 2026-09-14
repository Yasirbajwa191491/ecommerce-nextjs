import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

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

function countryName(code: PhoneCountryCode, locale = "en"): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
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
  return (
    countryFromTimeZone(options?.timeZone) ??
    countryFromLocale(options?.locale) ??
    FALLBACK_PHONE_COUNTRY
  );
}

export function detectRuntimePhoneCountry(): PhoneCountryCode {
  const resolved =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions()
      : undefined;

  const nav =
    typeof navigator !== "undefined"
      ? navigator.languages?.find((locale) => countryFromLocale(locale)) ??
        navigator.language
      : undefined;

  return getDefaultPhoneCountry({
    locale: nav ?? resolved?.locale,
    timeZone: resolved?.timeZone,
  });
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
