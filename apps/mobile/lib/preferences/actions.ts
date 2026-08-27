import AsyncStorage from "@react-native-async-storage/async-storage";

import { CACHE_PREFIX } from "@/lib/offline/constants";
import { resetProductStore } from "@/lib/offline/product-store";
import { resetRecentlyViewed } from "@/lib/offline/recently-viewed";
import { resetWishlistStore } from "@/lib/offline/wishlist-queue";
import { resetAppPreferences } from "@/lib/preferences/storage";

const RECENT_SEARCHES_KEY = "mobile-recent-searches";

export async function clearLocalCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // non-blocking
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // non-blocking
  }
}

export async function clearRecentlyViewed(): Promise<void> {
  await resetRecentlyViewed();
}

export async function clearOfflineData(): Promise<void> {
  await clearLocalCache();
  await Promise.all([resetWishlistStore(), resetProductStore(), resetRecentlyViewed()]);
}

export async function resetAllPreferences(): Promise<void> {
  await resetAppPreferences();
}

export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    clearLocalCache(),
    clearRecentSearches(),
    resetRecentlyViewed(),
    resetWishlistStore(),
    resetProductStore(),
    resetAppPreferences(),
  ]);
}
