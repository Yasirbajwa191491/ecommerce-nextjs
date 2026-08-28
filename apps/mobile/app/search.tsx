import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, ListRenderItem, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { ProductCard } from "@/components/products/ProductCard";
import { Chip } from "@/components/ui/Chip";
import { Button } from "@/components/ui/Button";
import { SearchBarInput } from "@/components/ui/SearchBar";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHybridProductSearch } from "@/hooks/useHybridProductSearch";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { searchResultToProduct } from "@/lib/product-adapters";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import type { HomeCategory } from "@/lib/offline/types";
import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import type { Product } from "@/types/product";

const RECENT_KEY = "mobile-recent-searches";
const MAX_RECENT = 6;

export default function SearchScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createSearchStyles);
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { horizontalPadding, gridGap } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const isOnline = useOnlineStatus();
  const [query, setQuery] = useState(typeof q === "string" ? q : "");
  const [recent, setRecent] = useState<string[]>([]);
  const debouncedQuery = useDebouncedValue(query, 350);

  const suggestionsLive = useQuery(api.productSearchQueries.getSearchSuggestions, {});
  const trendingLive = useQuery(api.productSearchQueries.getTrendingSearches, {
    period: "7d",
    limit: 8,
  });
  const categoriesLive = useQuery(api.productCategories.listWithProductCounts);
  const suggestions = useOfflineCache(offlineKeys.searchSuggestions, suggestionsLive);
  const trending = useOfflineCache(offlineKeys.searchTrending, trendingLive);
  const categories = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesWithCounts,
    categoriesLive
  );

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
        try {
          const prev = raw ? (JSON.parse(raw) as string[]) : [];
          const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
          void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          void AsyncStorage.setItem(RECENT_KEY, JSON.stringify([trimmed]));
        }
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
          <View style={styles.blockHeader}>
            <Text style={styles.blockTitle}>Recent searches</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear recent searches"
              hitSlop={8}
              onPress={() => {
                setRecent([]);
                void AsyncStorage.removeItem(RECENT_KEY);
              }}
              style={styles.clearRecent}
            >
              <Text style={styles.clearRecentText}>Clear</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {recent.map((term) => (
              <Chip key={term} label={term} onPress={() => { setQuery(term); void saveRecent(term); }} />
            ))}
          </View>
        </View>
      ) : null}

      {trending.data && trending.data.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Trending</Text>
          <View style={styles.chips}>
            {trending.data.map((item) => (
              <Chip key={item.query} label={item.query} onPress={() => setQuery(item.query)} />
            ))}
          </View>
        </View>
      ) : null}

      {suggestions.data && suggestions.data.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Suggestions</Text>
          {suggestions.data.map((item) => (
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

      {categories.data && categories.data.length > 0 ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Popular categories</Text>
          <View style={styles.chips}>
            {categories.data.slice(0, 6).map((cat) => (
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
        accessibilityRole="button"
          accessibilityLabel="Search by image. Find products using a photo"
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
      <View style={[styles.container, rootStyle, { paddingTop: insets.top }]}>
        <View style={[styles.searchHeader, { paddingHorizontal: horizontalPadding }]}>
          <Pressable
            accessibilityRole="button"
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
            title={isOnline ? "Search failed" : "Search requires an internet connection."}
            message={
              isOnline
                ? "Something went wrong. Please try again."
                : "Connect to search, or browse products you've already viewed."
            }
            onRetry={() => setQuery((q) => q.trim())}
          />
        ) : showResults && !loading && products.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No matching products"
            description={`We couldn't find products matching "${debouncedQuery}". Try a different search, browse the shop, or find similar items from a photo.`}
            actionLabel="Browse the shop"
            onAction={() => router.push("/(tabs)/shop")}
            compact
          >
            <View style={styles.emptyActions}>
              <Button
                label="Ask AI"
                variant="outline"
                onPress={() =>
                  router.push({ pathname: "/(tabs)/ai", params: { q: debouncedQuery } })
                }
              />
              <Button
                label="Visual search"
                variant="ghost"
                onPress={() => router.push("/visual-search")}
              />
            </View>
          </EmptyState>
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
                {!isOnline ? (
                  <CachedDataNotice
                    title="Showing saved products"
                    message="Search requires an internet connection for new results."
                  />
                ) : null}
                {isSimilarFallback ? (
                  <View style={styles.aiBanner}>
                    <Ionicons name="sparkles" size={16} color={colors.primary} />
                    <View style={styles.aiBannerCopy}>
                      <Text style={styles.aiBannerTitle}>Similar products you may like</Text>
                      <Text style={styles.aiBannerText}>
                        No exact matches — here are AI-powered results.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.exactLabel}>Exact matches</Text>
                )}
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

function createSearchStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
    flex: 1,
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
    width: 44,
    height: 44,
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
  blockHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  blockTitle: {
    ...textStyles.sectionTitle,
    color: colors.foreground,
    fontSize: typography.base,
  },
  clearRecent: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  clearRecentText: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.primary,
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
    minHeight: 44,
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
    minHeight: 72,
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
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.primaryMuted,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  aiBannerCopy: {
    flex: 1,
    gap: 2,
  },
  aiBannerTitle: {
    fontSize: typography.sm,
    color: colors.primary,
    fontWeight: "700",
  },
  aiBannerText: {
    fontSize: typography.sm,
    color: colors.text,
    lineHeight: 18,
  },
  exactLabel: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  emptyActions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
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
    alignItems: "stretch",
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
}

