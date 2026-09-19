import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { appLockMessages } from "@/lib/app-lock/messages";
import { useTheme } from "@/providers/theme-context";

type AppLockScreenProps = {
  biometricLabel: string;
  busy: boolean;
  errorMessage: string | null;
  loading?: boolean;
  onUnlock: () => void;
};

export function AppLockScreen({
  biometricLabel,
  busy,
  errorMessage,
  loading = false,
  onUnlock,
}: AppLockScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + spacing["3xl"],
          paddingBottom: insets.bottom + spacing["3xl"],
        },
      ]}
      accessibilityViewIsModal
      accessibilityLabel={appLockMessages.title}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {appLockMessages.title}
        </Text>

        <View
          style={[styles.iconWrap, { backgroundColor: colors.primaryMuted }]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Ionicons name="lock-closed" size={40} color={colors.primary} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {appLockMessages.subtitle}
        </Text>

        {loading ? (
          <ActivityIndicator
            color={colors.primary}
            style={styles.spinner}
            accessibilityLabel={appLockMessages.unlockHint}
          />
        ) : (
          <Button
            label={appLockMessages.unlockButton(biometricLabel)}
            onPress={onUnlock}
            loading={busy}
            disabled={busy}
            fullWidth
            accessibilityHint={appLockMessages.unlockHint}
            style={styles.unlockButton}
          />
        )}

        {errorMessage ? (
          <Text
            style={[styles.error, { color: colors.destructive }]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            {errorMessage}
          </Text>
        ) : null}

        <Text style={[styles.note, { color: colors.muted }]}>
          {appLockMessages.protectedNote}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing["2xl"],
  },
  content: {
    alignItems: "center",
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing.md,
  },
  subtitle: {
    fontSize: typography.md,
    fontWeight: "500",
    textAlign: "center",
  },
  unlockButton: {
    marginTop: spacing.lg,
    maxWidth: 320,
  },
  spinner: {
    marginTop: spacing["2xl"],
  },
  error: {
    fontSize: typography.sm,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  note: {
    fontSize: typography.sm,
    textAlign: "center",
    lineHeight: 20,
    marginTop: spacing.xl,
    maxWidth: 280,
  },
});
