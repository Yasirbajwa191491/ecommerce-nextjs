import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View, StyleSheet } from "react-native";

import { radius, sizes, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type QuantityStepperProps = {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  min?: number;
  max?: number;
  accessibilityLabel?: string;
};

export function QuantityStepper({
  value,
  onDecrement,
  onIncrement,
  min = 1,
  max,
  accessibilityLabel = "Quantity",
}: QuantityStepperProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <View style={styles.control} accessibilityLabel={accessibilityLabel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Decrease quantity"
        accessibilityState={{ disabled: atMin }}
        disabled={atMin}
        hitSlop={4}
        onPress={onDecrement}
        style={({ pressed }) => [styles.button, pressed && !atMin && styles.pressed]}
      >
        <Ionicons name="remove" size={sizes.iconMd} color={atMin ? colors.muted : colors.foreground} />
      </Pressable>
      <Text style={styles.value} accessibilityLabel={`${value}`}>
        {value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Increase quantity"
        accessibilityState={{ disabled: atMax }}
        disabled={atMax}
        hitSlop={4}
        onPress={onIncrement}
        style={({ pressed }) => [styles.button, pressed && !atMax && styles.pressed]}
      >
        <Ionicons name="add" size={sizes.iconMd} color={atMax ? colors.muted : colors.foreground} />
      </Pressable>
    </View>
  );
}

function createStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    control: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    button: {
      width: sizes.qtyControl,
      height: sizes.qtyControl,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    pressed: {
      opacity: 0.7,
    },
    value: {
      minWidth: 28,
      textAlign: "center" as const,
      fontSize: typography.base,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
  });
}
