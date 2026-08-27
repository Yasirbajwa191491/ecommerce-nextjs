import { useQuery } from "convex/react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { OrderItemReviewPanel } from "@/components/reviews/OrderItemReviewPanel";
import type { PublicReview, ReviewOrderItem } from "@/components/reviews/types";
import { Skeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { api } from "@/lib/convex-api";
import { useTheme } from "@/providers/theme-context";
import type { Id } from "@convex/_generated/dataModel";

type OrderDeliveredReviewsProps = {
  orderNumber: string;
  customerEmail: string;
  accessToken?: string;
  items: ReviewOrderItem[];
  highlightProductId?: string;
};

export function OrderDeliveredReviews({
  orderNumber,
  customerEmail,
  accessToken,
  items,
  highlightProductId,
}: OrderDeliveredReviewsProps) {
  const { colors, textStyles } = useTheme();
  const reviewStatus = useQuery(api.productReviews.getOrderReviewStatus, {
    orderNumber,
    customerEmail,
    accessToken,
  });
  const customerReviews = useQuery(api.productReviews.getCustomerReviewsForOrder, {
    orderNumber,
    customerEmail,
    accessToken,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: { marginTop: spacing.sm },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        title: { ...textStyles.sectionTitle },
        description: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        items: { gap: spacing.md },
        itemCard: {
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderLight,
          padding: spacing.md,
          gap: spacing.xs,
        },
        itemName: {
          fontSize: typography.sm,
          fontWeight: "600",
          color: colors.foreground,
        },
      }),
    [colors, textStyles]
  );

  const reviewByProduct = useMemo(() => {
    const map = new Map<
      string,
      { review: PublicReview; imageStorageIds: Id<"_storage">[] }
    >();
    for (const entry of customerReviews ?? []) {
      map.set(entry.review.productId as string, {
        review: entry.review as PublicReview,
        imageStorageIds: entry.imageStorageIds,
      });
    }
    return map;
  }, [customerReviews]);

  if (reviewStatus === undefined || customerReviews === undefined) {
    return (
      <View style={styles.loading}>
        <Skeleton height={120} borderRadius={radius.lg} />
      </View>
    );
  }

  const hasReviewable = reviewStatus.some((entry) => entry.status !== "not_eligible");
  if (!hasReviewable) return null;

  return (
    <View style={styles.card} accessibilityRole="text">
      <Text style={styles.title}>Product reviews</Text>
      <Text style={styles.description}>
        Share your experience with items from this delivered order. Reviews are published
        after admin approval.
      </Text>

      <View style={styles.items}>
        {items.map((item) => {
          const statusEntry = reviewStatus.find(
            (entry) => entry.productId === item.productId
          );
          if (!statusEntry || statusEntry.status === "not_eligible") {
            return null;
          }

          return (
            <View key={item.productId} style={styles.itemCard}>
              <Text style={styles.itemName}>{item.productName}</Text>
              <OrderItemReviewPanel
                orderNumber={orderNumber}
                customerEmail={customerEmail}
                accessToken={accessToken}
                productId={item.productId as Id<"products">}
                productName={item.productName}
                status={statusEntry.status}
                review={reviewByProduct.get(item.productId)?.review}
                initialImageStorageIds={
                  reviewByProduct.get(item.productId)?.imageStorageIds
                }
                defaultExpanded={highlightProductId === item.productId}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
