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
import { HomeFeedSkeleton } from "@/components/ui/Skeleton";
import { colors, spacing } from "@/constants/theme";
import { api } from "@/lib/convex-api";

export default function HomeScreen() {
  const featured = useQuery(api.products.featured);
  const bestSellers = useQuery(api.products.bestSellers, { limit: 12 });
  const newArrivals = useQuery(api.products.newArrivals, { limit: 8 });
  const categories = useQuery(api.productCategories.listWithProductCounts);

  const isInitialLoading =
    featured === undefined &&
    bestSellers === undefined &&
    newArrivals === undefined &&
    categories === undefined;

  const onRefresh = useCallback(() => {
    // Convex queries auto-refresh on pull
  }, []);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header showLogo showSearch showCart />
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
            <HomeFeedSkeleton />
          ) : (
            <>
              <HomeSection
                title="Featured"
                subtitle="Hand-picked for you"
                onAction={() => router.push("/(tabs)/shop")}
              >
                <ProductCarousel
                  products={featured}
                  isLoading={featured === undefined}
                  size="featured"
                />
              </HomeSection>

              {categories === undefined || categories.length > 0 ? (
                <HomeSection
                  title="Shop by category"
                  subtitle="Browse collections"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <CategoryGrid categories={categories} isLoading={categories === undefined} />
                </HomeSection>
              ) : null}

              <RecommendationSection sectionType="recommended_for_you" limit={8} accent />

              {bestSellers && bestSellers.length > 0 ? (
                <HomeSection
                  title="Best sellers"
                  subtitle="Top picks from our customers"
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductCarousel
                    products={bestSellers}
                    isLoading={bestSellers === undefined}
                    showRank
                  />
                </HomeSection>
              ) : null}

              <View style={styles.promoWrap}>
                <PromoBanner />
              </View>

              <RecommendationSection sectionType="trending_in_interests" limit={8} />

              {newArrivals && newArrivals.length > 0 ? (
                <HomeSection
                  title="New arrivals"
                  subtitle="Fresh additions"
                  compact
                  onAction={() => router.push("/(tabs)/shop")}
                >
                  <ProductGridInline products={newArrivals} limit={4} />
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
    backgroundColor: colors.background,
  },
  aiEntry: {
    paddingTop: spacing.md,
  },
  promoWrap: {
    paddingTop: spacing["2xl"],
  },
});
