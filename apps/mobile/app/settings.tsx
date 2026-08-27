import Constants from "expo-constants";
import { router, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";

import { Header } from "@/components/layout/Header";
import { ThemedScreen } from "@/components/layout/ThemedScreen";
import {
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
  ThemeSelector,
} from "@/components/settings/SettingsSection";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { spacing, typography } from "@/constants/theme";
import {
  clearLocalCache,
  clearOfflineData,
  clearRecentlyViewed,
  clearRecentSearches,
  resetAllPreferences,
} from "@/lib/preferences/actions";
import { strings } from "@/lib/i18n/strings";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

type ConfirmAction =
  | "clearCache"
  | "clearSearches"
  | "clearRecentlyViewed"
  | "clearOffline"
  | "resetPreferences";

const CONFIRM_CONFIG: Record<
  ConfirmAction,
  { title: string; message: string; confirmLabel: string; destructive?: boolean }
> = {
  clearCache: {
    title: strings.settings.clearCache,
    message: strings.settings.clearCacheConfirm,
    confirmLabel: strings.common.clear,
    destructive: true,
  },
  clearSearches: {
    title: strings.settings.clearSearches,
    message: strings.settings.clearSearchesConfirm,
    confirmLabel: strings.common.clear,
    destructive: true,
  },
  clearRecentlyViewed: {
    title: strings.settings.clearRecentlyViewed,
    message: strings.settings.clearRecentlyViewedConfirm,
    confirmLabel: strings.common.clear,
    destructive: true,
  },
  clearOffline: {
    title: strings.settings.clearOfflineData,
    message: strings.settings.clearOfflineDataConfirm,
    confirmLabel: strings.common.clear,
    destructive: true,
  },
  resetPreferences: {
    title: strings.settings.resetPreferences,
    message: strings.settings.resetPreferencesConfirm,
    confirmLabel: strings.common.confirm,
    destructive: true,
  },
};

export default function SettingsScreen() {
  const {
    preference,
    setThemePreference,
    preferences,
    setNotificationPreferences,
    setShoppingPreferences,
    refreshPreferences,
    colors,
  } = useTheme();
  const { showSuccess } = useToast();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "1.0.0";
  const buildVersion =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    null;

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    switch (confirmAction) {
      case "clearCache":
        await clearLocalCache();
        showSuccess(strings.toast.cacheCleared);
        break;
      case "clearSearches":
        await clearRecentSearches();
        showSuccess(strings.toast.searchesCleared);
        break;
      case "clearRecentlyViewed":
        await clearRecentlyViewed();
        showSuccess("Recently viewed cleared");
        break;
      case "clearOffline":
        await clearOfflineData();
        showSuccess("Offline data cleared");
        break;
      case "resetPreferences":
        await resetAllPreferences();
        await refreshPreferences();
        showSuccess(strings.toast.preferencesReset);
        break;
    }
    setConfirmAction(null);
  }, [confirmAction, refreshPreferences, showSuccess]);

  const confirmConfig = confirmAction ? CONFIRM_CONFIG[confirmAction] : null;

  return (
    <ThemedScreen>
      <Header title={strings.settings.title} showSearch={false} showBack showCart={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsSection title={strings.settings.appearance}>
          <ThemeSelector value={preference} onChange={setThemePreference} />
        </SettingsSection>

        <SettingsSection
          title={strings.settings.notifications}
          footer={strings.settings.notificationsNote}
        >
          <SettingsToggleRow
            label={strings.settings.orderUpdates}
            value={preferences.notifications.orderUpdates}
            disabled
            onValueChange={(orderUpdates) => setNotificationPreferences({ orderUpdates })}
          />
          <SettingsToggleRow
            label={strings.settings.promotions}
            value={preferences.notifications.promotions}
            disabled
            onValueChange={(promotions) => setNotificationPreferences({ promotions })}
          />
          <SettingsToggleRow
            label={strings.settings.recommendations}
            value={preferences.notifications.recommendations}
            disabled
            onValueChange={(recommendations) =>
              setNotificationPreferences({ recommendations })
            }
          />
          <SettingsToggleRow
            label={strings.settings.marketingEmails}
            value={preferences.notifications.marketingEmails}
            disabled
            onValueChange={(marketingEmails) =>
              setNotificationPreferences({ marketingEmails })
            }
            isLast
          />
        </SettingsSection>

        <SettingsSection title={strings.settings.shopping}>
          <SettingsToggleRow
            label={strings.settings.personalizedRecommendations}
            value={preferences.shopping.showPersonalizedRecommendations}
            onValueChange={(showPersonalizedRecommendations) =>
              setShoppingPreferences({ showPersonalizedRecommendations })
            }
          />
          <SettingsToggleRow
            label={strings.settings.recentlyViewed}
            value={preferences.shopping.showRecentlyViewed}
            onValueChange={(showRecentlyViewed) =>
              setShoppingPreferences({ showRecentlyViewed })
            }
            isLast
          />
        </SettingsSection>

        <SettingsSection title={strings.settings.dataPrivacy}>
          <SettingsRow
            label={strings.settings.clearCache}
            onPress={() => setConfirmAction("clearCache")}
            destructive
          />
          <SettingsRow
            label={strings.settings.clearSearches}
            onPress={() => setConfirmAction("clearSearches")}
            destructive
          />
          <SettingsRow
            label={strings.settings.clearRecentlyViewed}
            onPress={() => setConfirmAction("clearRecentlyViewed")}
            destructive
          />
          <SettingsRow
            label={strings.settings.clearOfflineData}
            onPress={() => setConfirmAction("clearOffline")}
            destructive
          />
          <SettingsRow
            label={strings.settings.resetPreferences}
            onPress={() => setConfirmAction("resetPreferences")}
            destructive
            isLast
          />
        </SettingsSection>

        <SettingsSection title={strings.settings.about}>
          <SettingsRow
            label={strings.settings.appVersion}
            value={buildVersion ? `${appVersion} (${buildVersion})` : appVersion}
          />
          <SettingsRow
            label={strings.settings.aboutStore}
            showChevron
            onPress={() => router.push("/about" as Href)}
          />
          <SettingsRow
            label={strings.settings.terms}
            showChevron
            onPress={() => router.push("/terms" as Href)}
          />
          <SettingsRow
            label={strings.settings.privacy}
            showChevron
            onPress={() => router.push("/privacy" as Href)}
          />
          <SettingsRow
            label={strings.settings.contactSupport}
            showChevron
            onPress={() => router.push("/contact" as Href)}
            isLast
          />
        </SettingsSection>

        <Text style={[styles.footerNote, { color: colors.muted }]}>
          Push notifications require server infrastructure and are not yet enabled.
        </Text>
      </ScrollView>

      {confirmConfig ? (
        <ConfirmDialog
          visible={Boolean(confirmAction)}
          title={confirmConfig.title}
          message={confirmConfig.message}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setConfirmAction(null)}
        />
      ) : null}
    </ThemedScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
    gap: spacing["2xl"],
    paddingBottom: spacing["4xl"],
  },
  footerNote: {
    fontSize: typography.xs,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: spacing.lg,
  },
});
