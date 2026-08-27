import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/Button";
import { lightColors, radius, spacing, createTextStyles } from "@/constants/theme";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { strings } from "@/lib/i18n/strings";
import { useThemeOptional } from "@/providers/theme-context";

type GlobalErrorViewProps = {
  error: unknown;
  title?: string;
  onRetry?: () => void;
  showHomeAction?: boolean;
};

export function GlobalErrorView({
  error,
  title = strings.errors.generic,
  onRetry,
  showHomeAction = true,
}: GlobalErrorViewProps) {
  const insets = useSafeAreaInsets();
  const theme = useThemeOptional();
  const colors = theme?.colors ?? lightColors;
  const textStyles = theme?.textStyles ?? createTextStyles(lightColors);
  const message = getFriendlyErrorMessage(error);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.lg,
        },
        card: {
          width: "100%",
          maxWidth: 400,
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing["2xl"],
          alignItems: "center",
          gap: spacing.md,
        },
        iconWrap: {
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: colors.destructiveMuted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
        },
        title: { ...textStyles.sectionTitle, textAlign: "center" },
        message: { ...textStyles.bodySmall, textAlign: "center", maxWidth: 320 },
        actions: { width: "100%", gap: spacing.sm, marginTop: spacing.md },
      }),
    [colors, textStyles]
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing["2xl"], paddingBottom: insets.bottom + spacing["2xl"] },
      ]}
      accessibilityRole="alert"
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={36} color={colors.destructive} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          {onRetry ? (
            <Button label={strings.common.retry} onPress={onRetry} fullWidth size="lg" />
          ) : null}
          {showHomeAction ? (
            <Button
              label="Go to Home"
              variant={onRetry ? "outline" : "primary"}
              onPress={() => router.replace("/")}
              fullWidth
              size="lg"
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
