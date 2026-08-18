import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

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
  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole="text">
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={36} color={colors.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["3xl"],
    gap: spacing.md,
  },
  compact: {
    paddingVertical: spacing["2xl"],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...textStyles.sectionTitle,
    textAlign: "center",
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  button: {
    marginTop: spacing.sm,
    minWidth: 160,
  },
});
