import type { ThemePreference } from "@/constants/theme";

export const PREFERENCES_STORAGE_KEY = "@preferences/v1";
export const PREFERENCES_VERSION = 1;

export type NotificationPreferences = {
  orderUpdates: boolean;
  promotions: boolean;
  recommendations: boolean;
  marketingEmails: boolean;
};

export type ShoppingPreferences = {
  showPersonalizedRecommendations: boolean;
  showRecentlyViewed: boolean;
};

export type AppPreferences = {
  version: number;
  theme: ThemePreference;
  notifications: NotificationPreferences;
  shopping: ShoppingPreferences;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  orderUpdates: true,
  promotions: true,
  recommendations: true,
  marketingEmails: false,
};

export const DEFAULT_SHOPPING_PREFERENCES: ShoppingPreferences = {
  showPersonalizedRecommendations: true,
  showRecentlyViewed: true,
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  version: PREFERENCES_VERSION,
  theme: "system",
  notifications: DEFAULT_NOTIFICATION_PREFERENCES,
  shopping: DEFAULT_SHOPPING_PREFERENCES,
};
