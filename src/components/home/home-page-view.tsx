"use client";

import { AiShoppingSection } from "@/components/home/ai-shopping-section";
import { HomeHeroSection } from "@/components/home/home-hero-section";
import { ShopByCategorySection } from "@/components/home/shop-by-category-section";
import { BestSellersSection } from "@/components/home/best-sellers-section";
import { SpecialPromotionsSection } from "@/components/home/special-promotions-section";
import { RecentlyViewedSection } from "@/components/home/recently-viewed-section";
import { NewArrivalsSection } from "@/components/home/new-arrivals-section";
import { WhyChooseUsSection } from "@/components/home/why-choose-us-section";
import { CustomerReviewsSection } from "@/components/home/customer-reviews-section";
import { RecommendationSection } from "@/components/products/recommendation-section";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { CONVERSION_TRUST_STRIP } from "@/lib/home-content";
import { HOME_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { SHOP_BODY_SM } from "@/lib/typography";
import { cn } from "@/lib/utils";

function ConversionTrustStrip() {
  return (
    <div className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <StaggerGroup
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-6 gap-y-3 py-4 sm:gap-x-8",
            SHOP_BODY_SM
          )}
        >
          {CONVERSION_TRUST_STRIP.map(({ icon: Icon, label }, index) => (
            <StaggerItem key={label} index={index} variant="fade" staggerMs={60}>
              <span className="inline-flex items-center gap-2 font-medium">
                <Icon className="size-4 text-brand-primary" />
                {label}
              </span>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </div>
  );
}

function RecommendationBand({
  sectionType,
}: {
  sectionType: Parameters<typeof RecommendationSection>[0]["sectionType"];
}) {
  return (
    <div className={HOME_SECTION_PADDING_Y} style={PAGE_GUTTER}>
      <div className="mx-auto w-full max-w-[1600px]">
        <RecommendationSection sectionType={sectionType} />
      </div>
    </div>
  );
}

export function HomePageView() {
  return (
    <>
      <HomeHeroSection />
      <RecommendationBand sectionType="recommended_for_you" />
      <ShopByCategorySection />
      <BestSellersSection />
      <SpecialPromotionsSection />
      <RecentlyViewedSection />
      <RecommendationBand sectionType="trending_in_interests" />
      <NewArrivalsSection />
      <AiShoppingSection />
      <RecommendationBand sectionType="continue_shopping" />
      <RecommendationBand sectionType="recently_viewed" />
      <RecommendationBand sectionType="because_you_bought" />
      <RecommendationBand sectionType="because_you_viewed" />
      <RecommendationBand sectionType="ai_suggested" />
      <WhyChooseUsSection />
      <CustomerReviewsSection />
      <ConversionTrustStrip />
    </>
  );
}
