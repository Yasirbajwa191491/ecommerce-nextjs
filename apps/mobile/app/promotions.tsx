import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
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

function PromotionCard({ promotion, now }: { promotion: StorefrontPromotion; now: number }) {
  const recordClick = useMutation(api.productPromotions.recordClick);
  const { title, offerLine } = getPromotionDisplay(promotion);
  const endsLabel = formatPromotionEndsAt(promotion.endAt, now);

  return (
    <View style={styles.card}>
      <View style={styles.cardImages}>
        {promotion.buyProductImageUrl ? (
          <Image
            source={{ uri: promotion.buyProductImageUrl }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : null}
        {promotion.getProductImageUrl &&
        promotion.getProductImageUrl !== promotion.buyProductImageUrl ? (
          <Image
            source={{ uri: promotion.getProductImageUrl }}
            style={[styles.cardImage, styles.cardImageSecondary]}
            contentFit="cover"
          />
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Badge label={promotion.typeLabel} variant="primary" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardOffer}>{offerLine}</Text>
        {endsLabel ? <Text style={styles.cardEnds}>{endsLabel}</Text> : null}
        <Button
          label="Shop promotion"
          onPress={() => {
            void recordClick({ id: promotion._id });
            router.push(`/product/${promotion.buyProductId}?promo=${promotion._id}`);
          }}
        />
      </View>
    </View>
  );
}

export default function PromotionsScreen() {
  const now = useStableNow();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const { isOffline } = useNetworkStatus();
  const promotions = useQuery(api.productPromotions.listActiveForStorefront, { now });

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header title="Promotions" showBack showSearch={false} showWishlist showCompare />

        {isOffline && promotions === undefined ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding }}>
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
          <ScrollView contentContainerStyle={{ paddingHorizontal: horizontalPadding }}>
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
          <ScrollView
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
          >
            <Text style={styles.lead}>
              Exclusive offers, bundle deals, and limited-time savings across our catalog.
            </Text>
            {promotions.map((promo) => (
              <PromotionCard key={promo._id} promotion={promo} now={now} />
            ))}
            <MobileFooter compactBottom />
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingBottom: spacing["3xl"],
    gap: spacing.lg,
  },
  lead: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  cardImages: {
    flexDirection: "row",
    height: 160,
    backgroundColor: colors.borderLight,
  },
  cardImage: {
    flex: 1,
    height: "100%",
  },
  cardImageSecondary: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...textStyles.cardTitle,
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
});
