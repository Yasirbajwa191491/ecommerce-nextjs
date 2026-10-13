import { ProductCatalogView } from "@/components/catalog/ProductCatalogView";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Chip } from "@/components/ui/Chip";
import { SearchBarInput } from "@/components/ui/SearchBar";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import type { HomeCategory } from "@/lib/offline/types";

const RECENT_KEY = "mobile-recent-searches";
const MAX_RECENT = 6;

export default function SearchScreen() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createSearchStyles);
  const insets = useSafeAreaInsets();
  const { q } = useLocalSearchParams<{ q?: string }>();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();
  const routeQuery = typeof q === "string" ? q : "";
  const [queryState, setQueryState] = useState({ routeQuery, value: routeQuery });
  const query = queryState.routeQuery === routeQuery ? queryState.value : routeQuery;
  const setQuery = useCallback((value: string) => setQueryState({ routeQuery, value }), [routeQuery]);
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


  useEffect(() => {
    void AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      if (raw) {
        try {
          const parsed: unknown = JSON.parse(raw);
          setRecent(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT) : []);
        } catch {
          setRecent([]);
        }
      }
    }).catch(() => undefined);
  }, []);

  const saveRecent = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;
    setRecent((prev) => {
      const next = [trimmed, ...prev.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
      void AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  useEffect(() => {
    const term = debouncedQuery.trim();
    if (term.length < 2) return;
    void AsyncStorage.getItem(RECENT_KEY).then((raw) => {
      let previous: string[] = [];
      try {
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) previous = parsed.filter((item): item is string => typeof item === "string");
      } catch { /* Replace an invalid saved list. */ }
      return AsyncStorage.setItem(RECENT_KEY, JSON.stringify([term, ...previous.filter((item) => item !== term)].slice(0, MAX_RECENT)));
    }).catch(() => undefined);
  }, [debouncedQuery]);


  const showResults = debouncedQuery.trim().length >= 2;


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
              returnKeyType="search"
              onSubmitEditing={() => { void saveRecent(query); Keyboard.dismiss(); }}
              placeholder="Search products…"
            />
          </View>
        </View>

        {showResults ? (
          <ProductCatalogView showSearchInput={false} externalSearch={query} onSearchChange={setQuery} initialFilters={{ search: debouncedQuery }} />
        ) : EmptyContent}
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
    width: 48,
    height: 48,
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

