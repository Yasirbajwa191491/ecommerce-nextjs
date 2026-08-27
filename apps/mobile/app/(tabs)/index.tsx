import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { AiShoppingEntry } from "@/components/home/AiShoppingEntry";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { HomeSection } from "@/components/home/HomeSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { RecommendationSection } from "@/components/home/RecommendationSection";
import { MobileFooter } from "@/components/layout/MobileFooter";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { ProductGridInline } from "@/components/products/ProductGridInline";
import { CachedDataNotice } from "@/components/feedback/CachedDataNotice";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { HomeFeedSkeleton } from "@/components/ui/Skeleton";
import { spacing } from "@/constants/theme";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import type { HomeCategory } from "@/lib/offline/types";
import { refreshNetworkSnapshot } from "@/lib/network";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/theme-context";
import type { Product } from "@/types/product";

export default function HomeScreen() {
  const { isOffline } = useNetworkStatus();
  const { colors, preferences } = useTheme();
  const rootStyle = useScreenRootStyle();
  const showRecentlyViewed = preferences.shopping.showRecentlyViewed;
  const showRecommendations = preferences.shopping.showPersonalizedRecommendations;
  const liveFeatured = useQuery(api.products.featured);
  const liveBestSellers = useQuery(api.products.bestSellers, { limit: 12 });
  const liveNewArrivals = useQuery(api.products.newArrivals, { limit: 8 });
  const liveCategories = useQuery(api.productCategories.listWithProductCounts);
  const { products: recentlyViewed } = useRecentlyViewed();

  const featured = useOfflineCache<Product[]>(offlineKeys.homeFeatured, liveFeatured);
  const bestSellers = useOfflineCache<Product[]>(offlineKeys.homeBestSellers, liveBestSellers);
  const newArrivals = useOfflineCache<Product[]>(offlineKeys.homeNewArrivals, liveNewArrivals);
  const categories = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesWithCounts,
    liveCategories
  );

  const hasCachedHome =
    Boolean(featured.data?.length) ||
    Boolean(bestSellers.data?.length) ||
    Boolean(newArrivals.data?.length) ||
    Boolean(categories.data?.length) ||
    recentlyViewed.length > 0;

  const isInitialLoading =
    liveFeatured === undefined &&
    liveBestSellers === undefined &&
    liveNewArrivals === undefined &&
    liveCategories === undefined &&
    !hasCachedHome;

  const showingCached =
    isOffline &&
    hasCachedHome &&
    liveFeatured === undefined &&
    liveBestSellers === undefined &&
    liveNewArrivals === undefined;

  const onRefresh = useCallback(() => {
    // Convex queries auto-refresh on pull when online
  }, []);

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header showLogo showSearch showCart showSettings />
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.aiEntry}>
            <AiShoppingEntry />
          </View>

          {isInitialLoading ? (
            isOffline ? (
              <View style={styles.offlineWrap}>
                <OfflineNotice
                  title="You're offline"
                  message="Connect to the internet to browse products."
                  onRetry={() => void refreshNetworkSnapshot()}
                />
              </View>
            ) : (
              <HomeFeedSkeleton />
            )
          ) : (
            <>
              {showingCached ? (
                <View style={styles.cachedWrap}>
                  <CachedDataNotice
                    title="Showing saved store information"
                    message="Some information may be from your last visit."
                  />
                </View>
              ) : null}

              {featured.data && featured.data.length > 0 ? (
                <HomeSection
                  title="Featured"
                  subtitle="Hand-picked for you"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel
                    products={featured.data}
                    isLoading={liveFeatured === undefined && !featured.data}
                    size="featured"
                  />
                </HomeSection>
              ) : liveFeatured === undefined && !isOffline ? (
                <HomeSection
                  title="Featured"
                  subtitle="Hand-picked for you"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel products={undefined} isLoading size="featured" />
                </HomeSection>
              ) : null}

              {(categories.data && categories.data.length > 0) ||
              (liveCategories === undefined && !isOffline) ? (
                <HomeSection
                  title="Shop by category"
                  subtitle="Browse collections"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <CategoryGrid
                    categories={categories.data?.map((item) => ({
                      ...item,
                      productCount: item.productCount ?? 0,
                    }))}
                    isLoading={liveCategories === undefined && !categories.data}
                  />
                </HomeSection>
              ) : null}

              {showRecommendations ? (
                <RecommendationSection sectionType="recommended_for_you" limit={8} accent />
              ) : null}

              {bestSellers.data && bestSellers.data.length > 0 ? (
                <HomeSection
                  title="Best sellers"
                  subtitle="Top picks from our customers"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel
                    products={bestSellers.data}
                    isLoading={liveBestSellers === undefined && !bestSellers.data}
                    showRank
                  />
                </HomeSection>
              ) : null}

              <View style={styles.promoWrap}>
                <PromoBanner />
              </View>

              {showRecommendations ? (
                <RecommendationSection sectionType="trending_in_interests" limit={8} />
              ) : null}

              {showRecentlyViewed && recentlyViewed.length > 0 ? (
                <HomeSection
                  title="Recently viewed"
                  subtitle="Pick up where you left off"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel products={recentlyViewed} />
                </HomeSection>
              ) : null}

              {newArrivals.data && newArrivals.data.length > 0 ? (
                <HomeSection
                  title="New arrivals"
                  subtitle="Fresh additions"
                  compact
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductGridInline products={newArrivals.data} limit={4} />
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
  container: {
    flex: 1,
  },
  aiEntry: {
    paddingTop: spacing.md,
  },
  promoWrap: {
    paddingTop: spacing["2xl"],
  },
  cachedWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  offlineWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
