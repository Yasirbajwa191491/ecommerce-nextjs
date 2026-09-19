import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { formatLockoutCountdown } from "@/lib/app-lock/lockout";
import { appLockMessages } from "@/lib/app-lock/messages";
import { useTheme } from "@/providers/theme-context";

type AppLockScreenProps = {
  biometricLabel: string;
  busy: boolean;
  errorMessage: string | null;
  lockoutSecondsLeft?: number;
  onUnlock: () => void;
};

export function AppLockScreen({
  biometricLabel,
  busy,
  errorMessage,
  lockoutSecondsLeft = 0,
  onUnlock,
}: AppLockScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const lockedOut = lockoutSecondsLeft > 0;
  const timeLabel = formatLockoutCountdown(lockoutSecondsLeft);
  const buttonLabel = lockedOut
    ? appLockMessages.lockoutTryAgainLabel(timeLabel)
    : appLockMessages.unlockButton(biometricLabel);

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

        {lockedOut ? (
          <Text
            style={[styles.countdown, { color: colors.foreground }]}
            accessibilityRole="timer"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Try again in ${timeLabel}`}
          >
            {timeLabel}
          </Text>
        ) : null}

        <Button
          label={buttonLabel}
          onPress={onUnlock}
          loading={busy}
          disabled={busy || lockedOut}
          fullWidth
          accessibilityHint={
            lockedOut
              ? `Biometric unlock locked. Try again in ${timeLabel}`
              : appLockMessages.unlockHint
          }
          style={styles.unlockButton}
        />

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
  countdown: {
    fontSize: typography["2xl"],
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  unlockButton: {
    marginTop: spacing.lg,
    maxWidth: 320,
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
