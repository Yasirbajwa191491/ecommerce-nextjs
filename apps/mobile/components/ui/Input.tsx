import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { colors, radius, touchTarget, typography } from "@/constants/theme";

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
  ...props
}: InputProps) {
  const inputLabel = accessibilityLabel ?? label;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={inputLabel}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, error ? styles.inputError : null, style]}
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

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  input: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    fontSize: typography.base,
    color: colors.foreground,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  error: {
    fontSize: typography.sm,
    color: colors.destructive,
  },
  hint: {
    fontSize: typography.sm,
    color: colors.muted,
  },
});
