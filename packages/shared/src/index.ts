/** Shared constants and platform-agnostic helpers for web + mobile. */
export { APP_NAME, BRAND } from "./constants/brand";
export { DEFAULT_CURRENCY, formatCurrencyAmount } from "./format/currency";
export {
  getPrimaryImage,
  getPrimaryImageAlt,
  getPrimaryImageUrl,
  orderImagesForDisplay,
  resolvePrimaryImageIndex,
  type ProductImageEntry,
  type ProductWithImages,
} from "./products/images";
export { CART_STORAGE_KEY, type CheckoutCartLine } from "./cart/types";
export { mergeSearchPage } from "./search/pageMerge";
export {
  APP_LINK_BUNDLE_ID,
  APP_LINK_PATH_PREFIXES,
  APP_LINK_PATHS,
  buildAppleAppSiteAssociation,
  buildAssetLinks,
  parseSha256Fingerprints,
} from "./app-links";
export {
  FALLBACK_PHONE_COUNTRY,
  countryFlagEmoji,
  countryFromLocale,
  countryFromTimeZone,
  detectRuntimePhoneCountry,
  getDefaultPhoneCountry,
  isValidE164Phone,
  listPhoneCountries,
  normalizePhoneToE164,
  type PhoneCountryCode,
  type PhoneCountryOption,
} from "./phone/country";
export { createSearchLifecycle, type SearchPage, type SearchSnapshot } from "./search/lifecycle";
export { createCatalogPriceSelection, type CatalogPriceRange } from "./search/priceSelection";
