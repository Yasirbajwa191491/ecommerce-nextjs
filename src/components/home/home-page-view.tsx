"use client";

import { HomeHeroSection } from "@/components/home/home-hero-section";
import { ShopByCategorySection } from "@/components/home/shop-by-category-section";
import { FeaturedProductsSection } from "@/components/home/featured-products-section";
import { PromoBannerSection } from "@/components/home/promo-banner-section";
import { BestSellersSection } from "@/components/home/best-sellers-section";
import { NewArrivalsSection } from "@/components/home/new-arrivals-section";
import { WhyChooseUsSection } from "@/components/home/why-choose-us-section";
import { CustomerReviewsSection } from "@/components/home/customer-reviews-section";
import { StoreStatsSection } from "@/components/home/store-stats-section";
import { PopularBrandsSection } from "@/components/home/popular-brands-section";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { CONVERSION_TRUST_STRIP } from "@/lib/home-content";
import { PAGE_GUTTER } from "@/lib/layout-constants";

function ConversionTrustStrip() {
  return (
    <div className="border-y border-border/60 bg-muted/20">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <StaggerGroup className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 py-4 text-xs text-muted-foreground sm:gap-x-8 sm:text-sm">
        {CONVERSION_TRUST_STRIP.map(({ icon: Icon, label }, index) => (
          <StaggerItem key={label} index={index} variant="fade" staggerMs={60}>
            <span className="inline-flex items-center gap-2 font-medium">
              <Icon className="size-4 text-[#6254f3]" />
              {label}
            </span>
          </StaggerItem>
        ))}
        </StaggerGroup>
      </div>
    </div>
  );
}

export function HomePageView() {
  return (
    <>
      <HomeHeroSection />
      <ShopByCategorySection />
      <FeaturedProductsSection />
      <PromoBannerSection />
      <BestSellersSection />
      <NewArrivalsSection />
      <WhyChooseUsSection />
      <CustomerReviewsSection />
      <StoreStatsSection />
      <PopularBrandsSection />
      <ConversionTrustStrip />
    </>
  );
}
