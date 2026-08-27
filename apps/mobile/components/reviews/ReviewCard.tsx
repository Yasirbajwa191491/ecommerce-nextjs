import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { RatingStars } from "@/components/products/RatingStars";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import type { PublicReview } from "@/components/reviews/types";
import { useTheme } from "@/providers/theme-context";

type ReviewCardProps = {
  review: PublicReview;
  onMarkHelpful?: (reviewId: string) => void;
  helpfulLoading?: boolean;
};

function formatReviewDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(timestamp)
  );
}

export function ReviewCard({ review, onMarkHelpful, helpfulLoading }: ReviewCardProps) {
  const { colors, textStyles } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: spacing.md,
        },
        headerText: { flex: 1, gap: 2 },
        name: { fontSize: typography.sm, fontWeight: "600", color: colors.foreground },
        date: { fontSize: typography.xs, color: colors.textSecondary },
        badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        verifiedBadge: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.full,
          backgroundColor: colors.successMuted,
        },
        verifiedText: { fontSize: typography.xs, fontWeight: "600", color: colors.success },
        title: { ...textStyles.sectionTitle, fontSize: typography.base },
        content: { ...textStyles.body, fontSize: typography.sm },
        images: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        image: {
          width: 72,
          height: 72,
          borderRadius: radius.sm,
          backgroundColor: colors.borderLight,
        },
        reply: {
          borderRadius: radius.md,
          backgroundColor: colors.chipBackground,
          padding: spacing.md,
          gap: spacing.xs,
        },
        replyLabel: {
          fontSize: typography.xs,
          fontWeight: "700",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: colors.textSecondary,
        },
        replyText: { fontSize: typography.sm, color: colors.foreground, lineHeight: 20 },
        footer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderLight,
          paddingTop: spacing.md,
        },
      }),
    [colors, textStyles]
  );

  return (
    <View style={styles.card} accessibilityRole="text">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{review.customerName}</Text>
          <Text style={styles.date}>{formatReviewDate(review.createdAt)}</Text>
        </View>
        <RatingStars rating={review.rating} showCount={false} size={14} />
      </View>

      <View style={styles.badges}>
        {review.isVerifiedPurchase ? (
          <View style={styles.verifiedBadge} accessibilityLabel="Verified purchase">
            <Ionicons name="checkmark-circle" size={14} color={colors.success} />
            <Text style={styles.verifiedText}>Verified Purchase</Text>
          </View>
        ) : null}
        {review.aiTags?.map((tag) => (
          <Badge key={tag} label={tag} variant="default" />
        ))}
      </View>

      <Text style={styles.title}>{review.title}</Text>
      <Text style={styles.content}>{review.content}</Text>

      {review.imageUrls.length > 0 ? (
        <View style={styles.images}>
          {review.imageUrls.map((url, index) => (
            <Image
              key={url}
              source={{ uri: url }}
              style={styles.image}
              contentFit="cover"
              accessibilityLabel={`Review photo ${index + 1} of ${review.imageUrls.length}`}
            />
          ))}
        </View>
      ) : null}

      {review.adminReplyPublished ? (
        <View style={styles.reply} accessibilityRole="text" accessibilityLabel="Store response">
          <Text style={styles.replyLabel}>Store response</Text>
          <Text style={styles.replyText}>{review.adminReplyPublished}</Text>
        </View>
      ) : null}

      {onMarkHelpful ? (
        <View style={styles.footer}>
          <Button
            label={`Helpful (${review.helpfulCount})`}
            variant="outline"
            size="sm"
            loading={helpfulLoading}
            accessibilityLabel={`Mark review by ${review.customerName} as helpful, ${review.helpfulCount} votes`}
            onPress={() => onMarkHelpful(review._id)}
          />
        </View>
      ) : null}
    </View>
  );
}
