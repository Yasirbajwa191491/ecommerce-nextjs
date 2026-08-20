import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, sizes, typography } from "@/constants/theme";

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

const styles = StyleSheet.create({
  control: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  button: {
    width: sizes.qtyControl,
    height: sizes.qtyControl,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  value: {
    minWidth: 28,
    textAlign: "center",
    fontSize: typography.base,
    fontWeight: "700",
    color: colors.foreground,
  },
});
