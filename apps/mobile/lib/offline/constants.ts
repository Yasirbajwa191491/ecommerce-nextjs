/** Bump when the persisted cache shape changes. Incompatible data is dropped. */
export const CACHE_VERSION = 1;

export const CACHE_PREFIX = `@offline/v${CACHE_VERSION}/`;

export const MAX_CACHED_PRODUCTS = 80;
export const MAX_RECENTLY_VIEWED = 30;
export const MAX_CATEGORY_CACHES = 8;
export const MAX_CATEGORY_PRODUCTS = 20;
export const MAX_WISHLIST_QUEUE = 50;
export const MAX_QUEUE_ATTEMPTS = 5;

export const TTL = {
  categories: 24 * 60 * 60 * 1000,
  productDetail: 12 * 60 * 60 * 1000,
  home: 6 * 60 * 60 * 1000,
  shop: 6 * 60 * 60 * 1000,
  recommendations: 2 * 60 * 60 * 1000,
  similar: 6 * 60 * 60 * 1000,
  settings: 24 * 60 * 60 * 1000,
  searchMeta: 12 * 60 * 60 * 1000,
  trackOrder: 30 * 60 * 1000,
} as const;
