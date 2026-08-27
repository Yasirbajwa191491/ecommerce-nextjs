import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius, sizes, spacing, touchTarget, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          backgroundColor: colors.surfaceSecondary,
          borderRadius: radius.lg,
          padding: 4,
          gap: 4,
        },
        segment: {
          flex: 1,
          minHeight: touchTarget,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
        },
        segmentSelected: { backgroundColor: colors.selected },
        segmentPressed: { opacity: 0.85 },
        label: {
          fontSize: typography.sm,
          fontWeight: "500",
          color: colors.textSecondary,
          textAlign: "center",
        },
        labelSelected: { color: colors.selectedForeground, fontWeight: "600" },
      }),
    [colors]
  );

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={styles.container}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type IconSegmentedOption<T extends string> = {
  value: T;
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
};

type IconSegmentedControlProps<T extends string> = {
  options: IconSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

export function IconSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: IconSegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        iconContainer: {
          flexDirection: "row",
          backgroundColor: colors.surfaceSecondary,
          borderRadius: radius.md,
          padding: 3,
          gap: 2,
        },
        iconSegment: {
          width: touchTarget,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.sm,
        },
        iconSegmentSelected: { backgroundColor: colors.selected },
        segmentPressed: { opacity: 0.85 },
      }),
    [colors]
  );

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={styles.iconContainer}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.accessibilityLabel}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.iconSegment,
              selected && styles.iconSegmentSelected,
              pressed && styles.segmentPressed,
            ]}
          >
            <Ionicons
              name={option.icon}
              size={sizes.iconMd}
              color={selected ? colors.selectedForeground : colors.muted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
