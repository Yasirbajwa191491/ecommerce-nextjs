import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View, type ViewStyle, StyleSheet } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createCheckboxStyles);

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
            <Ionicons name="checkmark" size={14} color={colors.ctaForeground} />
          ) : null}
        </View>
        <View style={styles.labelWrap}>{typeof label === "string" ? <Text style={styles.label}>{label}</Text> : label}</View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createCheckboxStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
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
      alignItems: "center" as const,
      justifyContent: "center" as const,
      marginTop: 1,
    },
    boxChecked: {
      backgroundColor: colors.cta,
      borderColor: colors.cta,
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
}
