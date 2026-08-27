import { useMemo } from "react";
import { Pressable, StyleSheet, Text, ViewStyle } from "react-native";

import { radius, sizes, spacing, typography } from "@/constants/theme";
import type { ColorPalette } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
};

function chipStyles(colors: ColorPalette) {
  return StyleSheet.create({
    chip: {
      minHeight: sizes.chip,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
    },
    chipCompact: {
      minHeight: 36,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
    },
    chipSelected: {
      backgroundColor: colors.selectedMuted,
      borderColor: colors.selected,
    },
    pressed: { opacity: 0.88 },
    label: {
      fontSize: typography.sm,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    labelSelected: {
      color: colors.selected,
      fontWeight: "600",
    },
  });
}

export function Chip({ label, selected = false, onPress, style, compact = false }: ChipProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => chipStyles(colors), [colors]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        compact && styles.chipCompact,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
