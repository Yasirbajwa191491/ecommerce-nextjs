import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import {
  describeDeliveryOption,
  formatDeliveryCharge,
  getEnabledDeliveryOptions,
} from "@/lib/product-display";
import type { Product } from "@/types/product";

type ProductDeliverySectionProps = {
  product: Product;
};

export function ProductDeliverySection({ product }: ProductDeliverySectionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const options = getEnabledDeliveryOptions(product);
  if (options.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Ionicons name="car-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>Delivery options</Text>
      </View>
      <View style={styles.list}>
        {options.map((option) => {
          const described = describeDeliveryOption(product, option.type);
          if (!described) return null;
          return (
            <View key={option.type} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>{described.label}</Text>
                <Text style={styles.estimate}>Est. {described.estimate}</Text>
              </View>
              <Text style={styles.charge}>
                {formatDeliveryCharge(described.charge, product.currency)}
              </Text>
            </View>
          );
        })}
      </View>
      {product.shipping === true ? (
        <Text style={styles.note}>
          Standard delivery includes free shipping on this product.
        </Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    section: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    header: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
    },
    title: {
      ...textStyles.sectionTitle,
      fontSize: 17,
      color: colors.foreground,
    },
    list: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    rowText: {
      flex: 1,
      gap: 2,
    },
    label: {
      ...textStyles.bodySmall,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    estimate: {
      ...textStyles.caption,
      color: colors.muted,
    },
    charge: {
      ...textStyles.bodySmall,
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    note: {
      ...textStyles.caption,
      color: colors.success,
    },
  });
}
