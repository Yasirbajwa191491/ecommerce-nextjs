import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { strings } from "@/lib/i18n/strings";
import { getNotificationPermissionStatus } from "@/lib/push-notifications";
import { usePushNotificationContextOptional } from "@/providers/PushNotificationProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

type PushStatusBannerProps = {
  customerEmail?: string;
  accessToken?: string;
};

export function PushStatusBanner({ customerEmail, accessToken }: PushStatusBannerProps) {
  const push = usePushNotificationContextOptional();
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const [enabling, setEnabling] = useState(false);
  const [osPermission, setOsPermission] = useState<
    "granted" | "denied" | "undetermined" | null
  >(null);

  const refreshOsPermission = useCallback(async () => {
    const permission = await getNotificationPermissionStatus();
    setOsPermission(permission);
    return permission;
  }, []);

  const registerDevice = useCallback(async () => {
    if (!push) {
      return false;
    }

    const permission = await refreshOsPermission();
    if (permission === "granted") {
      await push.refreshPushRegistration();
      return push.syncPushTokenIfPermitted(customerEmail, accessToken);
    }

    return push.enablePushNotifications(customerEmail, accessToken);
  }, [accessToken, customerEmail, push, refreshOsPermission]);

  useEffect(() => {
    void refreshOsPermission();
  }, [push?.expoPushToken, push?.permission, refreshOsPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" || !push) {
        return;
      }

      void (async () => {
        const permission = await refreshOsPermission();
        if (permission === "granted") {
          await push.refreshPushRegistration();
          await push.syncPushTokenIfPermitted(customerEmail, accessToken);
        }
      })();
    });

    return () => subscription.remove();
  }, [accessToken, customerEmail, push, refreshOsPermission]);

  const handleEnable = useCallback(async () => {
    if (!push || enabling) {
      return;
    }

    setEnabling(true);
    try {
      const registered = await registerDevice();
      if (registered) {
        showSuccess(strings.notifications.pushEnabled);
        return;
      }

      const permission = await refreshOsPermission();
      if (permission === "denied") {
        showError(strings.notifications.pushBlocked);
        return;
      }

      showError(push.lastError ?? strings.notifications.pushEnableFailed);
    } finally {
      setEnabling(false);
    }
  }, [enabling, push, refreshOsPermission, registerDevice, showError, showSuccess]);

  const handleOpenSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  if (!push) {
    return null;
  }

  const permission = osPermission ?? push.permission;
  const isFullyRegistered = permission === "granted" && Boolean(push.expoPushToken);

  if (isFullyRegistered) {
    return null;
  }

  const isDenied = permission === "denied";
  const isGrantedNeedsSync = permission === "granted" && !push.expoPushToken;

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: colors.primarySubtle,
          borderColor: colors.primary,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>
        {isDenied
          ? strings.notifications.pushBlockedTitle
          : isGrantedNeedsSync
            ? strings.notifications.pushRegisterTitle
            : strings.notifications.pushOffTitle}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {isDenied
          ? strings.notifications.pushBlockedBody
          : isGrantedNeedsSync
            ? strings.notifications.pushRegisterBody
            : strings.notifications.pushOffBody}
      </Text>
      <View style={styles.actions}>
        {isDenied ? (
          <Button
            label={strings.notifications.openSettings}
            variant="primary"
            size="sm"
            onPress={() => void handleOpenSettings()}
          />
        ) : (
          <Button
            label={
              enabling
                ? strings.common.loading
                : isGrantedNeedsSync
                  ? strings.notifications.registerDevice
                  : strings.notifications.promptEnable
            }
            variant="primary"
            size="sm"
            onPress={() => void handleEnable()}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.base,
    fontWeight: "600",
  },
  body: {
    fontSize: typography.sm,
    lineHeight: 20,
  },
  actions: {
    alignSelf: "flex-start",
  },
});
