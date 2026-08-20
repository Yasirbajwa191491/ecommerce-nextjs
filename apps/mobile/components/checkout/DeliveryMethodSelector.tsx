import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

export type DeliveryMethodOption = {
  type: string;
  label: string;
  charge: number;
  estimate: string;
};

type DeliveryMethodSelectorProps = {
  methods: DeliveryMethodOption[];
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  disabled?: boolean;
};

export function DeliveryMethodSelector({
  methods,
  value,
  onChange,
  currency = "USD",
  disabled = false,
}: DeliveryMethodSelectorProps) {
  if (methods.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={textStyles.sectionTitle}>Delivery method</Text>
      </View>
      <View style={styles.options}>
        {methods.map((method) => {
          const selected = value === method.type;
          return (
            <Pressable
              key={method.type}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(method.type)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && !disabled && styles.optionPressed,
                disabled && styles.optionDisabled,
              ]}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? (
                  <Ionicons name="checkmark" size={14} color={colors.primaryForeground} />
                ) : null}
              </View>
              <View style={styles.optionContent}>
                <View style={styles.optionTopRow}>
                  <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>
                    {method.label}
                  </Text>
                  <Text style={styles.charge}>
                    {method.charge <= 0
                      ? "Free"
                      : formatCurrencyAmount(method.charge, currency)}
                  </Text>
                </View>
                <Text style={styles.estimate}>{method.estimate}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionPressed: {
    opacity: 0.92,
  },
  optionDisabled: {
    opacity: 0.6,
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
    marginTop: 2,
  },
  radioSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionContent: {
    flex: 1,
    gap: 4,
  },
  optionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  optionTitle: {
    flex: 1,
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  charge: {
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  estimate: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
});
