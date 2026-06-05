/** ISO 4217 active currency codes. */
export const ISO_CURRENCY_CODES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
  "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GHS", "GIP", "GMD",
  "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR",
  "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR", "KMF",
  "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL",
  "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR",
  "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR",
  "RON", "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD",
  "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SVC", "SYP", "SZL", "THB",
  "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX",
  "USD", "UYU", "UZS", "VED", "VES", "VND", "VUV", "WST", "XAF", "XCD",
  "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWG",
] as const;

export type CurrencyCode = (typeof ISO_CURRENCY_CODES)[number];

export const DEFAULT_CURRENCY: CurrencyCode = "USD";

export type CurrencyOption = {
  code: string;
  name: string;
};

const currencyDisplay =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "currency" })
    : null;

function currencyName(code: string): string {
  return currencyDisplay?.of(code) ?? code;
}

export const CURRENCIES: CurrencyOption[] = ISO_CURRENCY_CODES.map((code) => ({
  code,
  name: currencyName(code),
})).sort((a, b) => a.code.localeCompare(b.code));

export function getCurrencyByCode(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code === code);
}

export function formatCurrencyLabel(code: string): string {
  const currency = getCurrencyByCode(code);
  return currency ? `${currency.code} — ${currency.name}` : code;
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function isValidCurrencyCode(code: string): boolean {
  return ISO_CURRENCY_CODES.includes(code as CurrencyCode);
}
