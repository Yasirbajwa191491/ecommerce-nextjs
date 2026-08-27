import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: boolean;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel = "See all",
  onAction,
  accent = false,
}: SectionHeaderProps) {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: spacing.md,
        },
        textBlock: { flex: 1, gap: 2 },
        accentRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 2,
        },
        accentLabel: {
          ...textStyles.caption,
          color: colors.primary,
          textTransform: "uppercase",
        },
        title: { ...textStyles.sectionTitle },
        subtitle: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        action: {
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          minHeight: 44,
          paddingVertical: spacing.xs,
          justifyContent: "center",
        },
        actionPressed: { opacity: 0.7 },
        actionText: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.textSecondary,
        },
      }),
    [colors, textStyles]
  );

  return (
    <View style={styles.row}>
      <View style={styles.textBlock}>
        {accent ? (
          <View style={styles.accentRow}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.accentLabel}>AI powered</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {onAction ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}
