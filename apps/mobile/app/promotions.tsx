import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useStableNow } from "@/hooks/useStableNow";
import {
  formatPromotionEndsAt,
  getPromotionDisplay,
  type PromotionDisplayInput,
} from "@/lib/promotion-display";
import { api } from "@/lib/convex-api";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import type { Id } from "@convex/_generated/dataModel";

type StorefrontPromotion = PromotionDisplayInput & {
  _id: Id<"productPromotions">;
  typeLabel: string;
  buyProductId: Id<"products">;
  buyProductImageUrl?: string;
  getProductImageUrl?: string;
  endAt: number;
};

function PromotionCard({
  promotion,
  now,
  style,
}: {
  promotion: StorefrontPromotion;
  now: number;
  style?: ViewStyle;
}) {
  const styles = useThemedStyles(createPromotionsStyles);
  const recordClick = useMutation(api.productPromotions.recordClick);
  const { title, offerLine } = getPromotionDisplay(promotion);
  const endsLabel = formatPromotionEndsAt(promotion.endAt, now);
  const buyImageUrl = promotion.buyProductImageUrl;
  const getImageUrl = promotion.getProductImageUrl;
  const showGetImage = Boolean(getImageUrl && getImageUrl !== buyImageUrl);

  const openPromotion = () => {
    void recordClick({ id: promotion._id });
    router.push(`/product/${promotion.buyProductId}?promo=${promotion._id}`);
  };

  return (
    <View style={[styles.card, style]}>
      {buyImageUrl || showGetImage ? (
        <View style={styles.cardImages}>
          {buyImageUrl ? (
            <Image
              source={{ uri: buyImageUrl }}
              style={styles.cardImage}
              contentFit="contain"
              accessibilityLabel={promotion.buyProductName}
            />
          ) : null}
          {showGetImage && getImageUrl ? (
            <Image
              source={{ uri: getImageUrl }}
              style={styles.cardImage}
              contentFit="contain"
              accessibilityLabel={promotion.getProductName ?? "Promotional product"}
            />
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardBody}>
        <Badge label={promotion.typeLabel} variant="primary" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardOffer}>{offerLine}</Text>
        {endsLabel ? <Text style={styles.cardEnds}>{endsLabel}</Text> : null}
        <Button
          label="Shop promotion"
          size="sm"
          accessibilityLabel={`Shop promotion: ${title}`}
          onPress={openPromotion}
          style={styles.shopButton}
        />
      </View>
    </View>
  );
}

export default function PromotionsScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createPromotionsStyles);
  const now = useStableNow();
  const { contentWidth, horizontalPadding } = useLayoutMetrics();
  const insets = useSafeAreaInsets();
  const rootStyle = useScreenRootStyle();
  const { isOffline } = useNetworkStatus();
  const promotions = useQuery(api.productPromotions.listActiveForStorefront, { now });
  const columns = contentWidth >= 720 ? 2 : 1;
  const cardWidth =
    columns === 2
      ? (contentWidth - horizontalPadding * 2 - spacing.lg) / 2
      : undefined;
  const scrollPadding = {
    paddingHorizontal: horizontalPadding,
    paddingTop: spacing.lg,
    paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing["3xl"],
  };

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Promotions" showBack showSearch={false} showWishlist showCompare />

        {isOffline && promotions === undefined ? (
          <ScrollView contentContainerStyle={scrollPadding}>
            <OfflineNotice
              title="You're offline"
              message="Connect to see current promotions."
              onRetry={() => router.replace("/promotions" as Href)}
            />
            <MobileFooter compactBottom />
          </ScrollView>
        ) : promotions === undefined ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : promotions.length === 0 ? (
          <ScrollView contentContainerStyle={scrollPadding}>
            {isOffline ? (
              <OfflineNotice
                title="You're offline"
                message="Connect to see current promotions."
                onRetry={() => router.replace("/promotions" as Href)}
              />
            ) : (
              <EmptyState
                icon="pricetag-outline"
                title="No active promotions"
                description="Check back soon for new deals and exclusive offers."
                actionLabel="Browse products"
                onAction={() => router.push("/(tabs)/shop")}
                compact
              />
            )}
            <MobileFooter compactBottom />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={[styles.listContent, scrollPadding]}>
            <Text style={styles.lead}>
              Exclusive offers, bundle deals, and limited-time savings across our catalog.
            </Text>
            <View style={styles.grid}>
              {promotions.map((promo) => (
                <PromotionCard
                  key={promo._id}
                  promotion={promo}
                  now={now}
                  style={cardWidth ? { width: cardWidth } : undefined}
                />
              ))}
            </View>
            <MobileFooter compactBottom />
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

function createPromotionsStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      gap: spacing.lg,
    },
    lead: {
      ...textStyles.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.lg,
    },
    card: {
      width: "100%",
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: "hidden",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
    },
    cardImages: {
      flexDirection: "row",
      height: 168,
      gap: spacing.sm,
      padding: spacing.sm,
      backgroundColor: colors.surfaceSecondary,
    },
    cardImage: {
      flex: 1,
      height: "100%",
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
    },
    cardBody: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
    },
    cardTitle: {
      ...textStyles.cardTitle,
      color: colors.foreground,
      fontSize: typography.lg,
    },
    cardOffer: {
      fontSize: typography.sm,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    cardEnds: {
      fontSize: typography.sm,
      fontWeight: "600",
      color: colors.primary,
    },
    shopButton: {
      alignSelf: "flex-start",
      flexGrow: 0,
      flexShrink: 1,
      maxWidth: "100%",
      marginTop: spacing.xs,
    },
  });
}

