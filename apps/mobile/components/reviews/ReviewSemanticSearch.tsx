import { useAction } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TextInput, View } from "react-native";

import type { PublicReview } from "@/components/reviews/types";
import { radius, sizes, spacing, typography } from "@/constants/theme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import type { Id } from "@convex/_generated/dataModel";

type ReviewSemanticSearchProps = {
  productId: Id<"products">;
  onResults: (reviews: PublicReview[] | null) => void;
};

export function ReviewSemanticSearch({ productId, onResults }: ReviewSemanticSearchProps) {
  const { showError } = useToast();
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 400);
  const [loading, setLoading] = useState(false);
  const search = useAction(api.productReviewSearch.searchReviewsSemantic);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          minHeight: sizes.search,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        input: {
          flex: 1,
          fontSize: typography.base,
          color: colors.foreground,
          paddingVertical: spacing.sm,
        },
      }),
    [colors]
  );

  const handleResults = useCallback(
    (reviews: PublicReview[] | null) => {
      onResults(reviews);
    },
    [onResults]
  );

  useEffect(() => {
    if (!debounced.trim()) {
      handleResults(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      try {
        const results = await search({ productId, queryText: debounced.trim() });
        if (cancelled) return;
        handleResults(
          results.map((review) => ({
            _id: review._id,
            customerName: review.customerName,
            rating: review.rating,
            title: review.title,
            content: review.content,
            imageUrls: review.imageUrls,
            isVerifiedPurchase: review.isVerifiedPurchase,
            helpfulCount: review.helpfulCount,
            createdAt: review.createdAt,
            aiTags: review.aiTags,
            adminReplyPublished: review.adminReplyPublished,
          }))
        );
      } catch (error) {
        if (cancelled) return;
        handleResults([]);
        showError(
          getFriendlyErrorMessage(error, "Search temporarily unavailable. Try again in a moment.")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced, handleResults, productId, search, showError]);

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={sizes.iconMd} color={colors.muted} />
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={setQuery}
        placeholder="Search reviews…"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Search reviews"
        accessibilityHint="Find reviews by topic or keyword"
        returnKeyType="search"
        keyboardType="default"
      />
      {loading ? <ActivityIndicator size="small" color={colors.cta} accessibilityLabel="Searching reviews" /> : null}
    </View>
  );
}
