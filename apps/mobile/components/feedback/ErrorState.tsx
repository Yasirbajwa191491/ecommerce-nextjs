import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { strings } from "@/lib/i18n/strings";
import { useTheme } from "@/providers/theme-context";

type ErrorStateProps = {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
  actionLabel?: string;
};

export function ErrorState({
  title = strings.errors.generic,
  message,
  error,
  onRetry,
  actionLabel = strings.common.retry,
}: ErrorStateProps) {
  const { colors } = useTheme();
  const displayMessage =
    message ??
    (error
      ? getFriendlyErrorMessage(error)
      : `${strings.errors.genericDetail} ${strings.errors.tryAgain}`);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing["2xl"],
          gap: spacing.md,
        },
        iconWrap: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.destructiveMuted,
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          fontSize: typography.lg,
          fontWeight: "700",
          color: colors.foreground,
          textAlign: "center",
        },
        message: {
          fontSize: typography.sm,
          color: colors.muted,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 320,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry ? (
        <Button
          label={actionLabel}
          variant="outline"
          onPress={onRetry}
          accessibilityLabel={actionLabel}
        />
      ) : null}
    </View>
  );
}
