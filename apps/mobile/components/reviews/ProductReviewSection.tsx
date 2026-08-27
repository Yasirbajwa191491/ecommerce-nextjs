import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { RatingBreakdown } from "@/components/reviews/RatingBreakdown";
import { ReviewAiSummary } from "@/components/reviews/ReviewAiSummary";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewSemanticSearch } from "@/components/reviews/ReviewSemanticSearch";
import { ReviewTopicInsights } from "@/components/reviews/ReviewTopicInsights";
import type { PublicReview } from "@/components/reviews/types";
import { RatingStars } from "@/components/products/RatingStars";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Skeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { getReviewVoterKey } from "@/lib/review-voter-key";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { triggerHaptic } from "@/lib/haptics";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";

const PAGE_SIZE = 5;

type ReviewSort = "recent" | "highest" | "lowest" | "helpful";
type RatingFilter = "all" | 1 | 2 | 3 | 4 | 5;

const SORT_OPTIONS: { label: string; value: ReviewSort }[] = [
  { label: "Recent", value: "recent" },
  { label: "Highest", value: "highest" },
  { label: "Lowest", value: "lowest" },
  { label: "Helpful", value: "helpful" },
];

const RATING_FILTERS: { label: string; value: RatingFilter }[] = [
  { label: "All", value: "all" },
  { label: "5★", value: 5 },
  { label: "4★", value: 4 },
  { label: "3★", value: 3 },
  { label: "2★", value: 2 },
  { label: "1★", value: 1 },
];

type ProductReviewSectionProps = {
  productId: Id<"products">;
};

export function ProductReviewSection({ productId }: ProductReviewSectionProps) {
  const { showError, showSuccess } = useToast();
  const { colors, textStyles } = useTheme();
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [semanticReviews, setSemanticReviews] = useState<PublicReview[] | null>(null);
  const [helpfulLoadingId, setHelpfulLoadingId] = useState<string | null>(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { gap: spacing.lg },
        loading: { gap: spacing.md },
        header: { gap: spacing.xs },
        title: { ...textStyles.sectionTitle },
        subtitle: { fontSize: typography.sm, color: colors.textSecondary },
        summaryCard: {
          gap: spacing.md,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        summaryText: { fontSize: typography.sm, color: colors.textSecondary },
        trackHint: {
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.chipBackground,
        },
        trackHintText: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          lineHeight: 20,
        },
        trackLink: { color: colors.primary, fontWeight: "600" },
        chipRow: {
          flexDirection: "row",
          gap: spacing.sm,
          paddingRight: spacing.md,
        },
        list: { gap: spacing.md },
        empty: {
          alignItems: "center",
          padding: spacing["2xl"],
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.chipBackground,
          gap: spacing.sm,
        },
        emptyTitle: {
          fontSize: typography.base,
          fontWeight: "600",
          color: colors.foreground,
        },
        emptyDescription: {
          fontSize: typography.sm,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 20,
        },
      }),
    [colors, textStyles]
  );

  const summary = useQuery(api.productReviews.getProductReviewSummary, { productId });
  const insights = useQuery(api.productReviewInsights.getByProductId, { productId });
  const tags = useQuery(api.productReviewInsights.listProductReviewTags, { productId });

  const listArgs = useMemo(
    () => ({
      productId,
      sort,
      ratingFilter: ratingFilter === "all" ? undefined : ratingFilter,
      tagFilter: tagFilter ?? undefined,
    }),
    [productId, sort, ratingFilter, tagFilter]
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.productReviews.listProductReviews,
    listArgs,
    { initialNumItems: PAGE_SIZE }
  );

  const markHelpful = useMutation(api.productReviews.markReviewHelpful);

  const handleSemanticResults = useCallback((reviews: PublicReview[] | null) => {
    setSemanticReviews(reviews);
  }, []);

  const handleMarkHelpful = useCallback(
    async (reviewId: string) => {
      setHelpfulLoadingId(reviewId);
      try {
        const voterKey = await getReviewVoterKey();
        await markHelpful({
          reviewId: reviewId as Id<"productReviews">,
          voterKey,
        });
        void triggerHaptic("light");
        showSuccess("Thanks for your feedback");
      } catch (error) {
        showError(getFriendlyErrorMessage(error, "Couldn't record vote"));
      } finally {
        setHelpfulLoadingId(null);
      }
    },
    [markHelpful, showError, showSuccess]
  );

  const displayedReviews = semanticReviews ?? results;
  const canLoadMore = status === "CanLoadMore" && !semanticReviews;

  if (summary === undefined) {
    return (
      <View style={styles.loading}>
        <Skeleton height={24} width="48%" />
        <Skeleton height={120} borderRadius={radius.lg} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer reviews</Text>
        <Text style={styles.subtitle}>Ratings from verified purchases</Text>
      </View>

      <ReviewAiSummary summary={insights?.summary} status={insights?.aiAnalysisStatus} />
      <ReviewTopicInsights topics={insights?.topics} status={insights?.aiAnalysisStatus} />

      <View style={styles.summaryCard}>
        <RatingStars rating={summary.averageRating} reviewCount={summary.totalReviews} />
        {summary.totalReviews > 0 ? (
          <Text style={styles.summaryText}>
            {summary.averageRating.toFixed(1)} out of 5 · Based on{" "}
            {summary.totalReviews.toLocaleString()}{" "}
            {summary.totalReviews === 1 ? "review" : "reviews"}
          </Text>
        ) : (
          <Text style={styles.summaryText}>No reviews yet</Text>
        )}
        {summary.totalReviews > 0 ? (
          <RatingBreakdown distribution={summary.distribution} />
        ) : null}
        <View style={styles.trackHint}>
          <Text style={styles.trackHintText}>
            Purchased this item?{" "}
            <Text
              style={styles.trackLink}
              accessibilityRole="link"
              onPress={() => router.push("/(tabs)/track")}
            >
              Track your order
            </Text>{" "}
            to leave a verified review after delivery.
          </Text>
        </View>
      </View>

      <ReviewSemanticSearch productId={productId} onResults={handleSemanticResults} />

      {tags && tags.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow} accessibilityRole="tablist" accessibilityLabel="Review topic filters">
            {tags.map((tag) => (
              <Chip
                key={tag.tagSlug}
                label={`${tag.tagLabel} (${tag.count})`}
                selected={tagFilter === tag.tagSlug}
                compact
                onPress={() =>
                  setTagFilter((current) =>
                    current === tag.tagSlug ? null : tag.tagSlug
                  )
                }
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow} accessibilityRole="tablist" accessibilityLabel="Rating filters">
          {RATING_FILTERS.map((option) => (
            <Chip
              key={String(option.value)}
              label={option.label}
              selected={ratingFilter === option.value}
              compact
              onPress={() => setRatingFilter(option.value)}
            />
          ))}
        </View>
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow} accessibilityRole="tablist" accessibilityLabel="Sort reviews">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={sort === option.value}
              compact
              onPress={() => setSort(option.value)}
            />
          ))}
        </View>
      </ScrollView>

      {displayedReviews.length === 0 ? (
        <View style={styles.empty} accessibilityRole="text">
          <Text style={styles.emptyTitle}>
            {semanticReviews ? "No matching reviews" : "No reviews yet"}
          </Text>
          <Text style={styles.emptyDescription}>
            {semanticReviews
              ? "Try a different search phrase."
              : "Be the first to share your experience after your order is delivered."}
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {displayedReviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              onMarkHelpful={handleMarkHelpful}
              helpfulLoading={helpfulLoadingId === review._id}
            />
          ))}
        </View>
      )}

      {canLoadMore ? (
        <Button
          label="Load more reviews"
          variant="outline"
          accessibilityLabel="Load more reviews"
          onPress={() => loadMore(PAGE_SIZE)}
        />
      ) : null}
    </View>
  );
}
