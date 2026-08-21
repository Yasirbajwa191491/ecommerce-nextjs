import { formatCurrencyAmount } from "@ecommerce/shared";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { formatColorLabel } from "@/lib/color-swatch";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

type PromotionGiftItem = {
  productName: string;
  color: string;
  quantity: number;
  imageUrl?: string;
  promotionName?: string;
};

type PromotionAppliedSectionProps = {
  gifts: PromotionGiftItem[];
  summaries?: {
    promotionName: string;
    freeQuantity: number;
    savingsAmount: number;
  }[];
  promotionSavingsTotal?: number;
  currency?: string;
};

export function PromotionAppliedSection({
  gifts,
  summaries = [],
  promotionSavingsTotal = 0,
  currency = "USD",
}: PromotionAppliedSectionProps) {
  if (gifts.length === 0 && summaries.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons name="gift-outline" size={18} color={colors.success} />
        <Text style={styles.title}>Promotion applied</Text>
      </View>

      {summaries.map((summary) => (
        <View key={summary.promotionName} style={styles.summaryBox}>
          <Text style={styles.summaryName}>{summary.promotionName}</Text>
          <Text style={styles.summaryMeta}>
            {summary.freeQuantity} free item{summary.freeQuantity !== 1 ? "s" : ""} · You save{" "}
            {formatCurrencyAmount(summary.savingsAmount, currency)}
          </Text>
        </View>
      ))}

      {gifts.map((gift, index) => (
        <View key={`${gift.productName}-${index}`} style={styles.giftRow}>
          <View style={styles.thumbWrap}>
            {gift.imageUrl ? (
              <Image source={{ uri: gift.imageUrl }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={styles.thumbPlaceholder}>
                <Ionicons name="gift-outline" size={16} color={colors.muted} />
              </View>
            )}
          </View>
          <View style={styles.giftText}>
            <Text style={styles.giftName} numberOfLines={2}>
              {gift.productName}
            </Text>
            <Text style={styles.giftMeta}>
              {formatColorLabel(gift.color)} · Qty {gift.quantity}
            </Text>
          </View>
          <Badge label="FREE" variant="success" />
        </View>
      ))}

      {promotionSavingsTotal > 0 ? (
        <Text style={styles.savingsTotal}>
          Total promotion savings:{" "}
          {formatCurrencyAmount(promotionSavingsTotal, currency)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ECFDF5",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#A7F3D0",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
    color: colors.success,
  },
  summaryBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#A7F3D0",
    gap: 2,
  },
  summaryName: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  summaryMeta: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  giftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  giftText: {
    flex: 1,
    gap: 2,
  },
  giftName: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  giftMeta: {
    fontSize: typography.xs,
    color: colors.textSecondary,
  },
  savingsTotal: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.success,
  },
});
