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
