import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ProductCatalogView } from "@/components/catalog/ProductCatalogView";
import { EmptyState } from "@/components/feedback/EmptyState";
import { OfflineNotice } from "@/components/feedback/OfflineNotice";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import type { HomeCategory } from "@/lib/offline/types";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import type { Id } from "@convex/_generated/dataModel";

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { isOffline } = useNetworkStatus();
  const { horizontalPadding } = useLayoutMetrics();
  const rootStyle = useScreenRootStyle();

  const liveCategories = useQuery(api.productCategories.listActive);
  const categories = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesActive,
    liveCategories
  );
  const category = useMemo(
    () => categories.data?.find((c) => c.slug === slug),
    [categories.data, slug]
  );

  const liveCategoryMeta = useQuery(api.productCategories.listWithProductCounts, {});
  const categoryMeta = useOfflineCache<HomeCategory[]>(
    offlineKeys.categoriesWithCounts,
    liveCategoryMeta
  );
  const categoryImage = categoryMeta.data?.find((c) => c.slug === slug)?.sampleImageUrl;

  if (liveCategories === undefined && !categories.data) {
    if (isOffline) {
      return (
        <ScreenContainer>
          <View style={[styles.container, rootStyle]}>
            <Header title="Category" showBack showSearch={false} />
            <View style={{ paddingHorizontal: horizontalPadding, paddingTop: spacing.lg }}>
              <OfflineNotice
                title="You're offline"
                message="Connect to the internet to browse this category."
                onRetry={() => router.replace(`/category/${slug}`)}
              />
            </View>
          </View>
        </ScreenContainer>
      );
    }
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Category" showBack showSearch={false} />
          <View style={[styles.loadingGrid, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.loadingRow}>
              <View style={styles.loadingCell}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.loadingCell}>
                <ProductCardSkeleton />
              </View>
            </View>
            <View style={styles.loadingRow}>
              <View style={styles.loadingCell}>
                <ProductCardSkeleton />
              </View>
              <View style={styles.loadingCell}>
                <ProductCardSkeleton />
              </View>
            </View>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  if (!category) {
    return (
      <ScreenContainer>
        <View style={[styles.container, rootStyle]}>
          <Header title="Category" showBack showSearch={false} />
          {isOffline ? (
            <View style={{ paddingHorizontal: horizontalPadding, paddingTop: spacing.lg }}>
              <OfflineNotice
                title="You're offline"
                message="Connect to the internet to browse this category."
                onRetry={() => router.replace(`/category/${slug}`)}
              />
            </View>
          ) : (
            <EmptyState
              icon="grid-outline"
              title="Category not found"
              description="This category may no longer exist."
              compact
            />
          )}
        </View>
      </ScreenContainer>
    );
  }

  const listHeaderExtra = (
    <View style={styles.headerExtra}>
      {categoryImage ? (
        <View style={styles.bannerWrap}>
          <Image source={{ uri: categoryImage }} style={styles.banner} contentFit="cover" />
        </View>
      ) : null}
      {category.description ? (
        <Text style={styles.description}>{category.description}</Text>
      ) : null}
    </View>
  );

  return (
    <ScreenContainer>
      <View style={[styles.container, rootStyle]}>
        <Header
          title={category.name}
          showBack
          showSearch={false}
          showWishlist
          showCompare
        />
        <ProductCatalogView
          fixedCategoryId={category._id as Id<"productCategories">}
          showCategoryChips={false}
          cacheKey={offlineKeys.categoryProducts(slug)}
          listHeaderExtra={listHeaderExtra}
          style={styles.catalog}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerExtra: {
    gap: spacing.md,
  },
  bannerWrap: {
    height: 120,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.borderLight,
  },
  banner: {
    width: "100%",
    height: "100%",
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  catalog: {
    flex: 1,
  },
  loadingGrid: {
    flex: 1,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  loadingRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  loadingCell: {
    flex: 1,
  },
});
