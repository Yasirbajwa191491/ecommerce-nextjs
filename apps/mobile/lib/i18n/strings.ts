/**
 * Centralized UI strings for localization readiness.
 * Do not translate automatically — structure only for future i18n.
 */
export const strings = {
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
    clear: "Clear",
    retry: "Try Again",
    continueShopping: "Continue Shopping",
    goBack: "Go Back",
    loading: "Loading",
    settings: "Settings",
  },
  errors: {
    generic: "Something went wrong.",
    genericDetail: "We couldn't load this page.",
    tryAgain: "Please try again.",
    offline: "You're offline. Connect to the internet and try again.",
    paymentFailed: "Payment could not be completed. Please try again.",
  },
  offline: {
    title: "You're offline",
    subtitle: "Some information may be from your last visit.",
    backOnline: "Back online",
    backOnlineDetail: "You can continue shopping.",
  },
  settings: {
    title: "Settings",
    appearance: "Appearance",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    notifications: "Notifications",
    notificationsNote:
      "Order and payment alerts use push notifications when enabled on this device.",
    orderUpdates: "Order updates",
    paymentUpdates: "Payment updates",
    promotions: "Promotional notifications",
    notificationCenter: "Notification center",
    recommendations: "Recommendations",
    marketingEmails: "Marketing emails",
    shopping: "Shopping Preferences",
    personalizedRecommendations: "Show personalized recommendations",
    recentlyViewed: "Show recently viewed",
    dataPrivacy: "Data & Privacy",
    clearCache: "Clear local cache",
    clearCacheConfirm:
      "This will remove cached product and category data from this device. You may need to reload pages while online.",
    clearSearches: "Clear recent searches",
    clearSearchesConfirm:
      "This will remove your saved searches from this device.",
    clearRecentlyViewed: "Clear recently viewed",
    clearRecentlyViewedConfirm:
      "This will remove your recently viewed products from this device.",
    clearOfflineData: "Clear offline data",
    clearOfflineDataConfirm:
      "This will remove all offline cached data from this device.",
    resetPreferences: "Reset app preferences",
    resetPreferencesConfirm:
      "This will reset theme, notification, and shopping preferences to defaults.",
    about: "About",
    appVersion: "App Version",
    aboutStore: "About store",
    terms: "Terms of Service",
    privacy: "Privacy Policy",
    contactSupport: "Contact support",
    support: "Support",
  },
  toast: {
    addedToCart: "Added to cart",
    addedToWishlist: "Added to wishlist",
    removedFromWishlist: "Removed from wishlist",
    filtersApplied: "Filters applied",
    orderPlaced: "Order placed successfully",
    cacheCleared: "Local cache cleared",
    searchesCleared: "Recent searches cleared",
    preferencesReset: "Preferences reset",
  },
  notifications: {
    promptTitle: "Stay updated on your orders",
    promptMessage:
      "Get instant alerts for order confirmations, shipping updates, and payment reminders — even when the app is closed.",
    promptEnable: "Enable notifications",
    promptLater: "Not now",
    pushOffTitle: "Device alerts are off",
    pushOffBody:
      "Turn on push notifications to receive order and payment updates on this phone.",
    pushBlockedTitle: "Notifications blocked",
    pushBlockedBody:
      "Push alerts are disabled in your phone settings. Open settings to allow notifications for this app.",
    openSettings: "Open settings",
    pushEnabled: "Push notifications enabled on this device.",
    pushBlocked: "Notifications are blocked in system settings.",
    pushEnableFailed: "Could not enable push notifications on this device.",
  },
  accessibility: {
    openSettings: "Open settings",
    openWishlist: "Open wishlist",
    openCart: "Open cart",
    openSearch: "Open search",
    addToWishlist: (productName: string) => `Add ${productName} to wishlist`,
    removeFromWishlist: (productName: string) => `Remove ${productName} from wishlist`,
    addToCart: (productName: string) => `Add ${productName} to cart`,
    themeOption: (theme: string) => `Theme: ${theme}`,
  },
} as const;

export type Strings = typeof strings;
