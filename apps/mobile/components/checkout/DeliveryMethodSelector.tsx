import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

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
  const { colors } = useTheme();
  const styles = useThemedStyles(createDeliveryMethodSelectorStyles);

  if (methods.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={styles.sectionTitle}>Delivery method</Text>
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
                  <Ionicons name="checkmark" size={14} color={colors.ctaForeground} />
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

function createDeliveryMethodSelectorStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    section: {
      gap: spacing.md,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    sectionTitle: {
      ...textStyles.sectionTitle,
      color: colors.foreground,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
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
    radio: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      backgroundColor: colors.surface,
      marginTop: 2,
    },
    radioSelected: {
      backgroundColor: colors.cta,
      borderColor: colors.cta,
    },
    optionContent: {
      flex: 1,
      gap: 4,
    },
    optionTopRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
    },
    optionTitle: {
      flex: 1,
      fontSize: typography.base,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    optionTitleSelected: {
      color: colors.cta,
    },
    charge: {
      fontSize: typography.base,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    estimate: {
      fontSize: typography.sm,
      color: colors.textSecondary,
    },
  });
}
