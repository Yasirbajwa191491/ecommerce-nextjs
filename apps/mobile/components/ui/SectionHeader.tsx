import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, spacing, textStyles, typography } from "@/constants/theme";

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
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
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
  title: {
    ...textStyles.sectionTitle,
  },
  subtitle: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.xs,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primary,
  },
});
