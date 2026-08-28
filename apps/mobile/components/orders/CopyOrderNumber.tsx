import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, StyleSheet } from "react-native";

import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { copyToClipboard } from "@/lib/clipboard";
import { triggerHaptic } from "@/lib/haptics";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

type CopyOrderNumberProps = {
  orderNumber: string;
};

export function CopyOrderNumber({ orderNumber }: CopyOrderNumberProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { showToast } = useToast();

  const handleCopy = async () => {
    const copied = await copyToClipboard(orderNumber);
    if (copied) {
      void triggerHaptic("success");
      showToast("Order number copied", { type: "success" });
      return;
    }
    showToast("Couldn't copy order number", { type: "error" });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy order number ${orderNumber}`}
      onPress={() => {
        void handleCopy();
      }}
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name="copy-outline" size={16} color={colors.primary} />
      <Text style={styles.label}>Copy order number</Text>
    </Pressable>
  );
}

function createStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      gap: spacing.xs,
      marginTop: spacing.xs,
      paddingVertical: spacing.xs,
    },
    pressed: {
      opacity: 0.7,
    },
    label: {
      fontSize: typography.sm,
      fontWeight: "600" as const,
      color: colors.primary,
    },
  });
}
