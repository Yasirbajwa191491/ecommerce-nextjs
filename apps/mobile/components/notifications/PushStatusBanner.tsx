import * as Linking from "expo-linking";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { strings } from "@/lib/i18n/strings";
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

  const handleEnable = useCallback(async () => {
    if (!push || enabling) {
      return;
    }

    setEnabling(true);
    try {
      const enabled = await push.enablePushNotifications(customerEmail, accessToken);
      if (enabled) {
        showSuccess(strings.notifications.pushEnabled);
        return;
      }

      if (push.permission === "denied") {
        showError(strings.notifications.pushBlocked);
        return;
      }

      showError(strings.notifications.pushEnableFailed);
    } finally {
      setEnabling(false);
    }
  }, [accessToken, customerEmail, enabling, push, showError, showSuccess]);

  const handleOpenSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  if (!push || push.permission === "granted") {
    return null;
  }

  const isDenied = push.permission === "denied";

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
        {isDenied ? strings.notifications.pushBlockedTitle : strings.notifications.pushOffTitle}
      </Text>
      <Text style={[styles.body, { color: colors.mutedForeground }]}>
        {isDenied ? strings.notifications.pushBlockedBody : strings.notifications.pushOffBody}
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
            label={enabling ? strings.common.loading : strings.notifications.promptEnable}
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
