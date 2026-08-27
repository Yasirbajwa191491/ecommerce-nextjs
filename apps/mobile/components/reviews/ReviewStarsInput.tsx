import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { spacing, touchTarget } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type ReviewStarsInputProps = {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
  size?: number;
  productName?: string;
};

export function ReviewStarsInput({
  value,
  onChange,
  disabled = false,
  size = 28,
  productName,
}: ReviewStarsInputProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
        starBtn: {
          minWidth: touchTarget,
          minHeight: touchTarget,
          alignItems: "center",
          justifyContent: "center",
        },
        pressed: { opacity: 0.85 },
      }),
    []
  );

  return (
    <View
      style={styles.row}
      accessibilityRole="adjustable"
      accessibilityLabel={productName ? `Rate ${productName}` : "Rating"}
      accessibilityValue={{ min: 1, max: 5, now: value || 0, text: `${value || 0} of 5 stars` }}
    >
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;
        const filled = value >= starValue;
        return (
          <Pressable
            key={starValue}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} star${starValue === 1 ? "" : "s"}`}
            accessibilityState={{ selected: filled, disabled }}
            disabled={disabled}
            onPress={() => onChange(starValue)}
            style={({ pressed }) => [styles.starBtn, pressed && !disabled && styles.pressed]}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? colors.warning : colors.mutedForeground}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
