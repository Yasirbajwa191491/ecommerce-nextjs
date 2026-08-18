import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  ListRenderItem,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { ProductCard } from "@/components/products/ProductCard";
import { Chip } from "@/components/ui/Chip";
import { SearchBarInput } from "@/components/ui/SearchBar";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHybridProductSearch } from "@/hooks/useHybridProductSearch";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { searchResultToProduct } from "@/lib/product-adapters";
import { api } from "@/lib/convex-api";
import type { Product } from "@/types/product";

const RECENT_KEY = "mobile-recent-searches";
const MAX_RECENT = 6;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const [query, setQuery] = useState(typeof q === "string" ? q : "");
  const [recent, setRecent] = useState<string[]>([]);
  const debouncedQuery = useDebouncedValue(query, 350);

  const suggestions = useQuery(api.productSearchQueries.getSearchSuggestions, {});
  const trending = useQuery(api.productSearchQueries.getTrendingSearches, {
    period: "7d",
    limit: 8,
  });
  const categories = useQuery(api.productCategories.listWithProductCounts);

  const {
    products: searchResults,
    totalCount,
    loading,
    loadingMore,
    isSimilarFallback,
    error,
    hasMore,
    loadMore,
  } = useHybridProductSearch(debouncedQuery);

  useEffect(() => {
    void AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) {
        try {
          setRecent(JSON.parse(raw) as string[]);
        } catch {
          setRecent([]);
        }
      }
    });
  }, []);

  const saveRecent = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
      void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && !loading && searchResults.length > 0) {
      const trimmed = debouncedQuery.trim();
      void AsyncStorage.getItem(RECENT_KEY).then((raw) => {
        const prev = raw ? (JSON.parse(raw) as string[]) : [];
        const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
        void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
      });
    }
  }, [debouncedQuery, loading, searchResults.length]);

  const products = useMemo(
    () => searchResults.map(searchResultToProduct),
    [searchResults]
  );

  const showResults = debouncedQuery.trim().length >= 2;

  const renderItem: ListRenderItem<Product> = useCallback(
    ({ item }) => (
      <View style={styles.gridItem}>
        <ProductCard product={item} showActions />
      </View>
    ),
    []
  );

  const EmptyContent = (
    <ScrollView
      contentContainerStyle={[styles.emptyContent, { paddingHorizontal: horizontalPadding }]}
      keyboardShouldPersistTaps="handled"
    >
      {recent.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Recent searches</Text>
          <View style={styles.chips}>
            {recent.map((term) => (
              <Chip key={term} label={term} onPress={() => { setQuery(term); void saveRecent(term); }} />
            ))}
          </View>
        </View>
      ) : null}

      {trending && trending.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Trending</Text>
          <View style={styles.chips}>
            {trending.map((item) => (
              <Chip key={item.query} label={item.query} onPress={() => setQuery(item.query)} />
            ))}
          </View>
        </View>
      ) : null}

      {suggestions && suggestions.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Suggestions</Text>
          {suggestions.map((item) => (
            <Pressable
              key={item.query}
              onPress={() => setQuery(item.query)}
              style={styles.suggestionRow}
            >
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <Text style={styles.suggestionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {categories && categories.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Popular categories</Text>
          <View style={styles.chips}>
            {categories.slice(0, 6).map((cat) => (
              <Chip
                key={cat._id}
                label={cat.name}
                onPress={() => router.push(`/category/${cat.slug}`)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push("/visual-search")}
        style={styles.visualEntry}
      >
        <Ionicons name="camera-outline" size={22} color={colors.primary} />
        <View style={styles.visualCopy}>
          <Text style={styles.visualTitle}>Visual search</Text>
          <Text style={styles.visualSub}>Find products using a photo</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>
    </ScrollView>
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.searchHeader, { paddingHorizontal: horizontalPadding }]}>
          <Pressable
            accessibilityLabel="Go back"
            hitSlop={8}
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color={colors.foreground} />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <SearchBarInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Search products…"
            />
          </View>
        </View>

        {showResults && loading && products.length === 0 ? (
          <View style={[styles.skeletonGrid, { paddingHorizontal: horizontalPadding, gap: gridGap }]}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={styles.gridItem}>
                <ProductCardSkeleton />
              </View>
            ))}
          </View>
        ) : showResults && error ? (
          <ErrorState
            title="Search failed"
            message="Something went wrong. Please try again."
            onRetry={() => setQuery((q) => q.trim())}
          />
        ) : showResults && !loading && products.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No results found"
            description={`We couldn't find products matching "${debouncedQuery}".`}
            compact
          />
        ) : showResults ? (
          <FlatList
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={[styles.gridRow, { gap: gridGap }]}
            contentContainerStyle={[
              styles.listContent,
              { paddingHorizontal: horizontalPadding },
            ]}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                {isSimilarFallback ? (
                  <View style={styles.aiBanner}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={styles.aiBannerText}>
                      Similar products — no exact matches
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.resultCount}>
                  {totalCount} result{totalCount === 1 ? "" : "s"}
                </Text>
              </View>
            }
            onEndReached={() => {
              if (hasMore && !loadingMore) void loadMore();
            }}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ProductCardSkeleton />
                </View>
              ) : null
            }
          />
        ) : (
          EmptyContent
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputWrap: {
    flex: 1,
  },
  emptyContent: {
    paddingTop: spacing.lg,
    paddingBottom: spacing["3xl"],
    gap: spacing["2xl"],
  },
  block: {
    gap: spacing.md,
  },
  blockTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    fontSize: typography.base,
    color: colors.foreground,
  },
  visualEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  visualCopy: {
    flex: 1,
  },
  visualTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  visualSub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  resultsHeader: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  aiBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  aiBannerText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  resultCount: {
    fontSize: typography.sm,
    color: colors.textSecondary,
  },
  listContent: {
    paddingBottom: spacing["3xl"],
  },
  gridRow: {
    marginBottom: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: spacing.lg,
  },
  footerLoader: {
    paddingVertical: spacing.lg,
  },
});
