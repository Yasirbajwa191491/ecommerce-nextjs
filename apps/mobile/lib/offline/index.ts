export { CACHE_VERSION, TTL } from "@/lib/offline/constants";
export { offlineKeys } from "@/lib/offline/keys";
export { readCache, writeCache, removeCache, clearIncompatibleCache } from "@/lib/offline/storage";
export {
  cacheProducts,
  getCachedProduct,
  getCachedProducts,
  getAllCachedProducts,
  hydrateProductStore,
} from "@/lib/offline/product-store";
export {
  recordRecentlyViewed,
  getRecentlyViewedProducts,
  hydrateRecentlyViewed,
} from "@/lib/offline/recently-viewed";
export { searchCachedProducts } from "@/lib/offline/search-local";
