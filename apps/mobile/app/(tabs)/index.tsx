import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { AiShoppingEntry } from "@/components/home/AiShoppingEntry";
import { CategoryCard } from "@/components/home/CategoryCard";
import { HomeSection } from "@/components/home/HomeSection";
import { PromoBanner } from "@/components/home/PromoBanner";
import { RecommendationSection } from "@/components/home/RecommendationSection";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import { CategoryCardSkeleton } from "@/components/ui/Skeleton";
import { colors, spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { api } from "@/lib/convex-api";

export default function HomeScreen() {
  const featured = useQuery(api.products.featured);
  const bestSellers = useQuery(api.products.bestSellers, { limit: 12 });
  const newArrivals = useQuery(api.products.newArrivals, { limit: 12 });
  const categories = useQuery(api.productCategories.listWithProductCounts);
  const { horizontalPadding, categoryCardWidth, gridGap } = useLayoutMetrics();

  const isRefreshing =
    featured === undefined ||
    bestSellers === undefined ||
    newArrivals === undefined;

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
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.aiEntry}>
            <AiShoppingEntry />
          </View>

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

          <RecommendationSection sectionType="recommended_for_you" limit={8} accent />

          {categories === undefined ? (
            <View style={[styles.categorySkeleton, { paddingHorizontal: horizontalPadding }]}>
              {Array.from({ length: 3 }).map((_, i) => (
                <CategoryCardSkeleton key={i} width={categoryCardWidth} />
              ))}
            </View>
          ) : categories.length > 0 ? (
            <HomeSection
              title="Shop by Category"
              subtitle="Browse collections"
              onAction={() => router.push("/(tabs)/shop")}
            >
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item._id}
                contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: gridGap }}
                renderItem={({ item }) => (
                  <CategoryCard
                    name={item.name}
                    slug={item.slug}
                    productCount={item.productCount}
                    sampleImageUrl={item.sampleImageUrl}
                  />
                )}
                decelerationRate="fast"
                snapToInterval={categoryCardWidth + gridGap}
              />
            </HomeSection>
          ) : null}

          <View style={styles.promoWrap}>
            <PromoBanner />
          </View>

          {bestSellers && bestSellers.length > 0 ? (
            <HomeSection
              title="Best Sellers"
              subtitle="Top picks from our customers"
              onAction={() => router.push("/(tabs)/shop")}
            >
              <ProductCarousel
                products={bestSellers}
                isLoading={bestSellers === undefined}
              />
            </HomeSection>
          ) : null}

          <RecommendationSection sectionType="trending_in_interests" limit={8} />

          {newArrivals && newArrivals.length > 0 ? (
            <HomeSection
              title="New Arrivals"
              subtitle="Fresh additions"
              compact
              onAction={() => router.push("/(tabs)/shop")}
            >
              <ProductCarousel
                products={newArrivals}
                isLoading={newArrivals === undefined}
              />
            </HomeSection>
          ) : null}

          <View style={styles.bottomSpacer} />
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
    paddingTop: spacing.lg,
  },
  categorySkeleton: {
    flexDirection: "row",
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  bottomSpacer: {
    height: spacing["2xl"],
  },
});
