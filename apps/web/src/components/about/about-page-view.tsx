"use client";

import { AboutCtaSection } from "@/components/about/about-cta-section";
import {
  AboutStorySection,
  AboutWhyShopSection,
} from "@/components/about/about-education-sections";
import { AboutFaqSection } from "@/components/about/about-faq-section";
import { AboutHero } from "@/components/about/about-hero";

export function AboutPageView() {
  return (
    <div className="min-h-screen bg-muted/20">
      <AboutHero />
      <AboutStorySection />
      <AboutWhyShopSection />
      <AboutFaqSection />
      <AboutCtaSection />
    </div>
  );
}
