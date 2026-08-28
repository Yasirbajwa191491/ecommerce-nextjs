import { Ionicons } from "@expo/vector-icons";
import { Text, View, StyleSheet } from "react-native";

import { radius, spacing } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
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
  const { colors } = useTheme();
  const styles = useThemedStyles(createPromotionOfferBannerStyles);
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

function createPromotionOfferBannerStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    banner: {
      flexDirection: "row" as const,
      alignItems: "flex-start" as const,
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
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    content: {
      flex: 1,
      gap: 4,
    },
    typeBadge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 4,
      alignSelf: "flex-start" as const,
      backgroundColor: "rgba(16, 185, 129, 0.1)",
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    typeText: {
      ...textStyles.caption,
      color: colors.success,
      fontWeight: "700" as const,
      textTransform: "uppercase" as const,
    },
    title: {
      ...textStyles.cardTitle,
      color: colors.foreground,
    },
    subtitle: {
      ...textStyles.bodySmall,
      color: colors.text,
      lineHeight: 20,
    },
    ends: {
      ...textStyles.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
}
