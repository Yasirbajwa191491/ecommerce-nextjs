import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/constants/theme";
import { getWarrantyLabel } from "@/lib/product-display";
import type { Product } from "@/types/product";

type ProductWarrantySectionProps = {
  product: Product;
};

export function ProductWarrantySection({ product }: ProductWarrantySectionProps) {
  const label = getWarrantyLabel(product);
  if (!label) return null;

  return (
    <View style={styles.section}>
      <View style={styles.card}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <View style={styles.content}>
          <Text style={styles.title}>Warranty</Text>
          <Text style={styles.label}>{label}</Text>
          {product.warrantyDetails?.trim() ? (
            <Text style={styles.details}>{product.warrantyDetails.trim()}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...textStyles.cardTitle,
    fontSize: 15,
  },
  label: {
    ...textStyles.bodySmall,
    color: colors.muted,
  },
  details: {
    ...textStyles.caption,
    color: colors.muted,
    marginTop: 2,
  },
});
