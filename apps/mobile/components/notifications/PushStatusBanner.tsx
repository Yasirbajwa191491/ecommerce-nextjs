import * as Linking from "expo-linking";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { strings } from "@/lib/i18n/strings";
import { usePushNotificationContextOptional } from "@/providers/PushNotificationProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

type PushStatusBannerProps = { customerEmail?: string; accessToken?: string; dismissible?: boolean };

export function PushStatusBanner({ customerEmail, accessToken, dismissible = true }: PushStatusBannerProps) {
  const push = usePushNotificationContextOptional();
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const [enabling, setEnabling] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!push || dismissed || push.registered) return null;
  const unavailable = !push.capability.available;
  const denied = push.permission === "denied";
  const needsRegistration = push.permission === "granted";
  const handleEnable = async () => {
    if (enabling || push.syncing || unavailable) return;
    setEnabling(true);
    try {
      const registered = needsRegistration
        ? await push.syncPushTokenIfPermitted(customerEmail, accessToken)
        : await push.enablePushNotifications(customerEmail, accessToken);
      if (registered) showSuccess(strings.notifications.pushEnabled);
      else showError(strings.notifications.pushEnableFailed);
    } catch {
      showError(strings.notifications.pushEnableFailed);
    } finally { setEnabling(false); }
  };
  return <View style={[styles.banner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.title, { color: colors.foreground }]}>{unavailable ? strings.notifications.pushUnavailableTitle : denied ? strings.notifications.pushBlockedTitle : needsRegistration ? strings.notifications.pushRegisterTitle : strings.notifications.pushOffTitle}</Text>
    <Text style={[styles.body, { color: colors.textSecondary }]}>{unavailable ? push.capability.message : denied ? strings.notifications.pushBlockedBody : needsRegistration ? strings.notifications.pushRegisterBody : strings.notifications.pushOffBody}</Text>
    <View style={styles.actions}>
      {!unavailable ? <Button
        label={denied ? strings.notifications.openSettings : enabling || push.syncing ? "Enabling alerts…" : strings.notifications.promptEnable}
        variant="outline" size="sm" loading={enabling || push.syncing} disabled={enabling || push.syncing}
        onPress={() => { if (denied) void Linking.openSettings().catch(() => showError("Couldn't open settings. Please open your phone's notification settings.")); else void handleEnable(); }} /> : null}
      {dismissible ? <Button label={unavailable ? "Dismiss" : "Later"} variant="ghost" size="sm" onPress={() => setDismissed(true)} /> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  banner: { width: "100%", padding: spacing.md, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  title: { fontSize: typography.sm, fontWeight: "600" }, body: { fontSize: typography.sm, lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.sm },
});
