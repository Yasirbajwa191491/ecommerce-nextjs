import { Ionicons } from "@expo/vector-icons";
import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type EmptyStateProps = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  compact?: boolean;
};

export function EmptyState({
  icon = "cube-outline",
  title,
  description,
  actionLabel,
  onAction,
  children,
  compact = false,
}: EmptyStateProps) {
  const { colors, textStyles } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing["3xl"],
          gap: spacing.md,
        },
        compact: { paddingVertical: spacing["2xl"] },
        iconWrap: {
          width: 72,
          height: 72,
          borderRadius: radius.full,
          backgroundColor: colors.chipBackground,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm,
        },
        title: { ...textStyles.sectionTitle, textAlign: "center" },
        description: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 22,
          maxWidth: 300,
        },
        button: { marginTop: spacing.sm, minWidth: 160 },
      }),
    [colors, textStyles]
  );

  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
      {actionLabel && onAction ? (
        <Button label={actionLabel} variant="primary" onPress={onAction} style={styles.button} />
      ) : null}
    </View>
  );
}
