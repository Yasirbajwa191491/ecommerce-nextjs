import { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { radius, sizes, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  hint?: string;
};

export function Input({
  label,
  error,
  hint,
  style,
  accessibilityLabel,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputLabel = accessibilityLabel ?? label;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: { gap: spacing.sm },
        label: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
        input: {
          minHeight: sizes.input,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: spacing.lg,
          fontSize: typography.base,
          color: colors.foreground,
          backgroundColor: colors.surface,
        },
        inputFocused: { borderColor: colors.primary },
        inputError: { borderColor: colors.destructive },
        error: { fontSize: typography.sm, color: colors.destructive },
        hint: { fontSize: typography.sm, color: colors.muted },
      }),
    [colors]
  );

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={inputLabel}
        placeholderTextColor={colors.muted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          focused && !error ? styles.inputFocused : null,
          error ? styles.inputError : null,
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}
