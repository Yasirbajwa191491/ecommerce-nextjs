import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles } from "@/constants/theme";
import {
  formatPromotionEndsAt,
  getPromotionDisplay,
  type PromotionDisplayInput,
} from "@/lib/promotion-display";

type PromotionOfferBannerProps = {
  promotion: PromotionDisplayInput;
  now?: number;
};

export function PromotionOfferBanner({ promotion, now }: PromotionOfferBannerProps) {
  const { title, subtitle } = getPromotionDisplay(promotion);
  const endsLabel =
    promotion.endAt && now !== undefined
      ? formatPromotionEndsAt(promotion.endAt, now)
      : null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name="gift-outline" size={18} color={colors.success} />
      </View>
      <View style={styles.content}>
        {promotion.typeLabel ? (
          <View style={styles.typeBadge}>
            <Ionicons name="pricetag-outline" size={12} color={colors.success} />
            <Text style={styles.typeText}>{promotion.typeLabel}</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        {endsLabel ? <Text style={styles.ends}>{endsLabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 4,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  typeText: {
    ...textStyles.caption,
    color: colors.success,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    ...textStyles.cardTitle,
    color: "#065F46",
  },
  subtitle: {
    ...textStyles.bodySmall,
    color: "#047857",
    lineHeight: 20,
  },
  ends: {
    ...textStyles.caption,
    color: "#059669",
    marginTop: 2,
  },
});
