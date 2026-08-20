import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  error?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Checkbox({
  checked,
  onChange,
  label,
  error,
  disabled = false,
  style,
}: CheckboxProps) {
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        style={({ pressed }) => [
          styles.row,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.box, checked && styles.boxChecked, error && styles.boxError]}>
          {checked ? (
            <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
          ) : null}
        </View>
        <View style={styles.labelWrap}>{typeof label === "string" ? <Text style={styles.label}>{label}</Text> : label}</View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.6,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  boxError: {
    borderColor: colors.destructive,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 20,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: 34,
    fontSize: typography.sm,
    color: colors.destructive,
  },
});
