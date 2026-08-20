import {
  useRecommendations,
  type RecommendationSectionType,
} from "@/hooks/useRecommendations";
import { router } from "expo-router";
import { HomeSection } from "@/components/home/HomeSection";
import { ProductCarousel } from "@/components/products/ProductCarousel";
import type { Id } from "@convex/_generated/dataModel";

const SECTION_COPY: Record<
  RecommendationSectionType,
  { title: string; subtitle?: string }
> = {
  recommended_for_you: {
    title: "Recommended for you",
    subtitle: "Picked from your recent activity",
  },
  trending_in_interests: {
    title: "Trending in your interests",
    subtitle: "Popular with shoppers like you",
  },
  frequently_bought_together: {
    title: "Because you viewed this",
    subtitle: "Similar products you might like",
  },
  customers_also_purchased: {
    title: "Customers also bought",
    subtitle: "Frequently purchased together",
  },
};

type RecommendationSectionProps = {
  sectionType: RecommendationSectionType;
  productId?: Id<"products">;
  cartProductIds?: Id<"products">[];
  limit?: number;
  accent?: boolean;
};

export function RecommendationSection({
  sectionType,
  productId,
  cartProductIds,
  limit = 8,
  accent = false,
}: RecommendationSectionProps) {
  const { products, loading, isEmpty } = useRecommendations({
    sectionType,
    productId,
    cartProductIds,
    limit,
  });

  if (isEmpty && !loading) return null;

  const copy = SECTION_COPY[sectionType];

  return (
    <HomeSection
      title={copy.title}
      subtitle={copy.subtitle}
      accent={accent}
      onAction={() => router.push("/(tabs)/shop")}
    >
      <ProductCarousel products={products} isLoading={loading} />
    </HomeSection>
  );
}
