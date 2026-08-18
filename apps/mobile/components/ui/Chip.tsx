import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Chip({ label, selected = false, onPress, style }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  chipSelected: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.88,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
});
