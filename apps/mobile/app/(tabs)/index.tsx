import { useConvex, useQuery } from "convex/react";
import { ConvexHttpClient } from "convex/browser";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { AiShoppingEntry } from "@/components/home/AiShoppingEntry";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeSection } from "@/components/home/HomeSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { RecommendationSection } from "@/components/home/RecommendationSection";
import { Header } from "@/components/layout/Header";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductGridInline } from "@/components/products/ProductGridInline";
import { HomeFeedSkeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/constants/theme";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { api } from "@/lib/convex-api";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { refreshNetworkSnapshot } from "@/lib/network";
import { offlineKeys } from "@/lib/offline/keys";
import type { HomeCategory } from "@/lib/offline/types";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";
import type { Product } from "@/types/product";

export default function HomeScreen() {
  const convex = useConvex();
  const { isOffline } = useNetworkStatus();
  const { colors, preferences } = useTheme();
  const { showError } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const rootStyle = useScreenRootStyle();
  const { horizontalPadding } = useLayoutMetrics();
  const liveFeatured = useQuery(api.products.featured);
  const liveBestSellers = useQuery(api.products.bestSellers, { limit: 12 });
  const liveNewArrivals = useQuery(api.products.newArrivals, { limit: 8 });
  const liveCategories = useQuery(api.productCategories.listWithProductCounts);
  const { products: recentlyViewed } = useRecentlyViewed();
  const featured = useOfflineCache<Product[]>(
    offlineKeys.homeFeatured,
    liveFeatured,
  );
  const bestSellers = useOfflineCache<Product[]>(
    offlineKeys.homeBestSellers,
    liveBestSellers,
  );
  const newArrivals = useOfflineCache<Product[]>(
    offlineKeys.homeNewArrivals,
    liveNewArrivals,
  );
  const categories = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesWithCounts,
    liveCategories,
  );
  const showRecentlyViewed = preferences.shopping.showRecentlyViewed;
  const showRecommendations =
    preferences.shopping.showPersonalizedRecommendations;
  const availableCategories = categories.data
    ?.filter((category) => (category.productCount ?? 0) > 0)
    .map((category) => ({
      ...category,
      productCount: category.productCount ?? 0,
    }));

  // A small catalog should produce distinct shelves instead of repeating the same items.
  const shelves = useMemo(() => {
    const used = new Set<string>();
    const takeUnique = (products: Product[] | undefined, limit: number) => {
      const selected: Product[] = [];
      for (const product of products ?? []) {
        if (used.has(product._id)) continue;
        used.add(product._id);
        selected.push(product);
        if (selected.length >= limit) break;
      }
      return selected;
    };
    const picks = takeUnique(featured.data, 6);
    const popular = takeUnique(bestSellers.data, 6);
    const arrivals = takeUnique(newArrivals.data, 4);
    const viewed = showRecentlyViewed ? takeUnique(recentlyViewed, 6) : [];
    return { picks, popular, arrivals, viewed, displayedIds: [...used] };
  }, [
    featured.data,
    bestSellers.data,
    newArrivals.data,
    recentlyViewed,
    showRecentlyViewed,
  ]);

  const hasSavedContent = Boolean(
    featured.data?.length ||
    bestSellers.data?.length ||
    newArrivals.data?.length ||
    categories.data?.length ||
    (showRecentlyViewed && recentlyViewed.length),
  );
  const isInitialLoading =
    liveFeatured === undefined &&
    liveBestSellers === undefined &&
    liveNewArrivals === undefined &&
    liveCategories === undefined &&
    !hasSavedContent;
  const showingCached = isOffline && hasSavedContent;

  const onRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 15000);
    try {
      if (!(await refreshNetworkSnapshot())) {
        showError("You're offline. Your saved products are still available.");
        return;
      }
      // HTTP bypasses the React client's local cache. Live subscriptions still own the feed.
      const refreshClient = new ConvexHttpClient(convex.url, {
        fetch: (input, init) =>
          globalThis.fetch(input, { ...init, signal: abort.signal }),
      });
      await Promise.all([
        refreshClient.query(api.products.featured, {}),
        refreshClient.query(api.products.bestSellers, { limit: 12 }),
        refreshClient.query(api.products.newArrivals, { limit: 8 }),
        refreshClient.query(api.productCategories.listWithProductCounts, {}),
      ]);
    } catch (error) {
      showError(
        getFriendlyErrorMessage(
          error,
          "Couldn't refresh the store. Please try again.",
        ),
      );
    } finally {
      clearTimeout(timeout);
      setRefreshing(false);
    }
  }, [convex, refreshing, showError]);

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header
          showLogo
          showSearch
          showCart={false}
          showSettings
          showNotifications
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={colors.primary}
            />
          }
        >
          {isInitialLoading ? (
            isOffline ? (
              <View
                style={[
                  styles.notice,
                  { paddingHorizontal: horizontalPadding },
                ]}
              >
                <OfflineNotice
                  title="You're offline"
                  message="Reconnect to browse the store."
                  onRetry={() => void onRefresh()}
                />
              </View>
            ) : (
              <HomeFeedSkeleton />
            )
          ) : (
            <>
              {showingCached ? (
                <View
                  style={[
                    styles.notice,
                    { paddingHorizontal: horizontalPadding },
                  ]}
                >
                  <CachedDataNotice
                    title="You're browsing saved products"
                    message="Prices and availability will update when you reconnect."
                  />
                </View>
              ) : null}
              <View style={styles.offer}>
                <PromoBanner />
              </View>
              {availableCategories?.length ||
              (liveCategories === undefined &&
                !categories.data &&
                !isOffline) ? (
                <HomeSection
                  title="Shop by category"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <CategoryGrid
                    categories={availableCategories}
                    isLoading={liveCategories === undefined && !categories.data}
                  />
                </HomeSection>
              ) : null}
              {shelves.picks.length > 0 ||
              (liveFeatured === undefined && !featured.data && !isOffline) ? (
                <HomeSection
                  title="Featured picks"
                  subtitle="A few things we think you'll love"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel
                    products={shelves.picks}
                    isLoading={liveFeatured === undefined && !featured.data}
                    size="featured"
                  />
                </HomeSection>
              ) : null}
              {shelves.popular.length > 0 ? (
                <HomeSection
                  title="Best sellers"
                  subtitle="Popular with our shoppers"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel products={shelves.popular} />
                </HomeSection>
              ) : null}
              <View style={styles.searchEntry}>
                <AiShoppingEntry />
              </View>
              {shelves.arrivals.length > 0 ? (
                <HomeSection
                  title="New arrivals"
                  subtitle="Just added to the store"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductGridInline products={shelves.arrivals} />
                </HomeSection>
              ) : null}
              {showRecommendations ? (
                <RecommendationSection
                  sectionType="recommended_for_you"
                  limit={12}
                  excludeProductIds={shelves.displayedIds}
                />
              ) : null}
              {shelves.viewed.length > 0 ? (
                <HomeSection
                  title="Recently viewed"
                  subtitle="Pick up where you left off"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel products={shelves.viewed} />
                </HomeSection>
              ) : null}
            </>
          )}
          <MobileFooter compactBottom />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchEntry: { paddingTop: spacing["2xl"] },
  offer: { paddingTop: spacing.lg },
  notice: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
});
