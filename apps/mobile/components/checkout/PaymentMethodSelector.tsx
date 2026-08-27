import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import type { PaymentMethod } from "@/lib/validation/checkout-form";

type PaymentMethodSelectorProps = {
  value: PaymentMethod | "";
  onChange: (method: PaymentMethod) => void;
  error?: string;
  disabled?: boolean;
};

const OPTIONS: {
  id: PaymentMethod;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    id: "cod",
    title: "Cash on delivery",
    description: "Pay when your order arrives.",
    icon: "cash-outline",
  },
  {
    id: "stripe",
    title: "Card",
    description: "You'll securely complete your card payment with Stripe.",
    icon: "card-outline",
  },
];

export function PaymentMethodSelector({
  value,
  onChange,
  error,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <View style={styles.section}>
      <Text style={textStyles.sectionTitle}>3. Payment method</Text>
      <View style={styles.options}>
        {OPTIONS.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.id)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !disabled && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={selected ? colors.cta : colors.textSecondary}
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                  {option.title}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={colors.ctaForeground} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.cta,
    backgroundColor: colors.ctaMuted,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: {
    backgroundColor: colors.ctaMuted,
  },
  optionContent: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  optionTitleSelected: {
    color: colors.cta,
  },
  optionDescription: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  radioSelected: {
    backgroundColor: colors.cta,
    borderColor: colors.cta,
  },
  error: {
    fontSize: typography.sm,
    color: colors.destructive,
  },
});
