"use client";

import { AboutBrandsSection } from "@/components/about/about-brands-section";
import { AboutContactSection } from "@/components/about/about-contact-section";
import { AboutCtaSection } from "@/components/about/about-cta-section";
import {
  AboutAiFeaturesSection,
  AboutHowItWorksSection,
  AboutPaymentSection,
  AboutShippingSection,
  AboutStorySection,
  AboutSupportSection,
  AboutTrackingSection,
  AboutWhyShopSection,
} from "@/components/about/about-education-sections";
import { AboutFaqSection } from "@/components/about/about-faq-section";
import { AboutHero } from "@/components/about/about-hero";
import { AboutStatsSection } from "@/components/about/about-stats-section";

export function AboutPageView() {
  return (
    <div className="min-h-screen bg-muted/20">
      <AboutHero />
      <AboutStorySection />
      <AboutHowItWorksSection />
      <AboutWhyShopSection />
      <AboutAiFeaturesSection />
      <AboutPaymentSection />
      <AboutShippingSection />
      <AboutTrackingSection />
      <AboutSupportSection />
      <AboutStatsSection />
      <AboutBrandsSection />
      <AboutFaqSection />
      <AboutContactSection />
      <AboutCtaSection />
    </div>
  );
}
