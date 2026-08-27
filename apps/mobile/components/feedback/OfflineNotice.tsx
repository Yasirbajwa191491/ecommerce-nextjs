import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import {
  OFFLINE_GENERIC_MESSAGE,
  OFFLINE_MESSAGE,
  OFFLINE_TITLE,
} from "@/lib/network";
import { useTheme } from "@/providers/theme-context";

type OfflineNoticeProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
};

export function OfflineNotice({
  title = OFFLINE_TITLE,
  message = OFFLINE_GENERIC_MESSAGE,
  onRetry,
  compact = false,
}: OfflineNoticeProps) {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        banner: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
          alignItems: "center",
        },
        compact: { padding: spacing.md },
        title: {
          ...textStyles.sectionTitle,
          fontSize: typography.base,
          textAlign: "center",
        },
        message: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        },
      }),
    [colors, textStyles]
  );

  return (
    <View
      style={[styles.banner, compact && styles.compact]}
      accessibilityRole="alert"
      accessibilityLabel={`${title}. ${message}`}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Button label="Try Again" variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}

export function CheckoutOfflineNotice({ onRetry }: { onRetry?: () => void }) {
  return (
    <OfflineNotice title={OFFLINE_TITLE} message={OFFLINE_MESSAGE} onRetry={onRetry} />
  );
}
