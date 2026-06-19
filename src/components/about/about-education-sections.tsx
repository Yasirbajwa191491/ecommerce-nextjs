"use client";

import Link from "next/link";
import {
  BookOpen,
  CreditCard,
  Headphones,
  HelpCircle,
  PackageSearch,
  Sparkles,
  Truck,
} from "lucide-react";
import { AboutImage } from "@/components/about/about-image";
import { AboutSectionHeader } from "@/components/about/about-section-header";
import { ScrollReveal, StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { OrderProgressTimeline } from "@/components/orders/order-progress-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ABOUT_AI_FEATURES,
  ABOUT_STORY,
  HOW_IT_WORKS_STEPS,
  PAYMENT_BRANDS,
  PAYMENT_METHODS,
  SHIPPING_CARDS,
  SUPPORT_CHANNELS,
  SUPPORT_TOPICS,
  TRACKING_METHODS,
  TRACKING_STEPS,
  WHY_SHOP_FEATURES,
} from "@/lib/about-content";
import { OUTLINE_BUTTON_CLASS, PAGE_GUTTER, PRIMARY_BUTTON_CLASS, ABOUT_CARD_GRID_CLASS } from "@/lib/layout-constants";
import { SHOP_BODY } from "@/lib/typography";
import { cn } from "@/lib/utils";

function SectionShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-6 sm:py-10 md:py-12 lg:py-14", className)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        {children}
      </div>
    </section>
  );
}

export function AboutStorySection() {
  return (
    <SectionShell className="bg-muted/20">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">
        <ScrollReveal variant="headline">
          <AboutSectionHeader
            badge="Our Story"
            badgeIcon={BookOpen}
            title={ABOUT_STORY.title}
            description={ABOUT_STORY.subtitle}
            align="left"
            className="mx-0 max-w-none text-left"
          />
          <StaggerGroup className="mt-6 space-y-4">
            {ABOUT_STORY.paragraphs.map((paragraph, index) => (
              <StaggerItem key={paragraph.slice(0, 32)} index={index} variant="up">
                <p className={SHOP_BODY}>
                  {paragraph}
                </p>
              </StaggerItem>
            ))}
          </StaggerGroup>
          <StaggerGroup className="mt-6 space-y-3">
            {ABOUT_STORY.highlights.map((item, index) => (
              <StaggerItem key={item} index={index} variant="up">
                <div className={cn("flex items-start gap-3 text-foreground", SHOP_BODY)}>
                  <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#6254f3]/10 text-[#6254f3]">
                    <Sparkles className="size-3" />
                  </span>
                  {item}
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </ScrollReveal>

        <ScrollReveal variant="scale" delay={80}>
          <AboutImage
            src={ABOUT_STORY.image.src}
            alt={ABOUT_STORY.image.alt}
          />
        </ScrollReveal>
      </div>
    </SectionShell>
  );
}

export function AboutHowItWorksSection() {
  return (
    <SectionShell className="bg-background">
      <AboutSectionHeader
        badge="How It Works"
        badgeIcon={Sparkles}
        title="How Our Store Works"
        description="From browsing to delivery — here is your complete shopping journey in six simple steps."
      />
      <ol className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5">
        {HOW_IT_WORKS_STEPS.map(({ step, title, description, icon: Icon }) => (
          <li
            key={step}
            className="flex flex-col rounded-xl border border-border/60 bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#6254f3] text-xs font-bold text-white sm:size-8 sm:text-sm">
                {step}
              </span>
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl">
                <Icon className="size-4 sm:size-5" />
              </span>
            </div>
            <h3 className="mt-3 text-xs font-semibold text-foreground sm:mt-4 sm:text-sm md:text-base">
              {title}
            </h3>
            <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs md:text-sm md:leading-relaxed">
              {description}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export function AboutWhyShopSection() {
  return (
    <SectionShell className="bg-muted/20">
      <AboutSectionHeader
        badge="Why Us"
        badgeIcon={Sparkles}
        title="Why Shop With Us"
        description="Everything you need for a confident, hassle-free online shopping experience."
      />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:gap-5">
        {WHY_SHOP_FEATURES.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col items-center p-3 text-center sm:p-4 md:p-5">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#6254f3]/10 text-[#6254f3] sm:size-10 md:size-12">
                <Icon className="size-4 sm:size-5 md:size-6" />
              </span>
              <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm md:text-base">
                {title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs md:text-sm md:leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutAiFeaturesSection() {
  return (
    <SectionShell className="bg-background">
      <AboutSectionHeader
        badge="AI Features"
        badgeIcon={Sparkles}
        title="AI-Powered Shopping & Operations"
        description="We combine ecommerce fundamentals with practical AI tooling for smarter search, communication, and catalog management."
      />
      <div className={ABOUT_CARD_GRID_CLASS}>
        {ABOUT_AI_FEATURES.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col p-3 sm:p-4 md:p-5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl md:size-10">
                <Icon className="size-4 sm:size-5" />
              </span>
              <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm md:text-base">
                {title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:mt-2 sm:text-xs md:text-sm md:leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutPaymentSection() {
  return (
    <SectionShell className="bg-background">
      <AboutSectionHeader
        badge="Payments"
        badgeIcon={CreditCard}
        title="Payment Methods"
        description="Choose the payment option that works best for you. All card transactions are processed securely."
      />
      <div className={ABOUT_CARD_GRID_CLASS}>
        {PAYMENT_METHODS.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col p-3 sm:p-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl">
                <Icon className="size-4 sm:size-5" />
              </span>
              <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">
                {title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs md:text-sm md:leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-8">
        <span className="mr-2 text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
          We accept
        </span>
        {PAYMENT_BRANDS.map((brand) => (
          <span
            key={brand}
            className="rounded-md border border-border/60 bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground"
          >
            {brand}
          </span>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutShippingSection() {
  return (
    <SectionShell className="bg-muted/20">
      <AboutSectionHeader
        badge="Shipping"
        badgeIcon={Truck}
        title="Shipping & Delivery"
        description="Transparent shipping information so you always know what to expect before and after checkout."
      />
      <div className={ABOUT_CARD_GRID_CLASS}>
        {SHIPPING_CARDS.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col p-3 sm:p-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl">
                <Icon className="size-4 sm:size-5" />
              </span>
              <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">
                {title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs md:text-sm md:leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionShell>
  );
}

export function AboutTrackingSection() {
  return (
    <SectionShell className="bg-background">
      <AboutSectionHeader
        badge="Tracking"
        badgeIcon={PackageSearch}
        title="Order Tracking"
        description="Stay informed at every stage — track your order using any of the details from checkout."
      />

      <div className="mt-6 flex flex-wrap justify-center gap-2 sm:mt-8">
        {TRACKING_METHODS.map((method) => (
          <span
            key={method}
            className="rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-medium text-[#6254f3] sm:px-4 sm:py-1.5 sm:text-xs md:text-sm"
          >
            {method}
          </span>
        ))}
      </div>

      <ol className="mt-6 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-3 md:gap-4">
        {TRACKING_STEPS.map(({ step, title, description }) => (
          <li
            key={step}
            className="relative flex flex-col rounded-xl border border-border/60 bg-card p-3 text-center shadow-sm sm:p-4"
          >
            <span className="mx-auto flex size-7 items-center justify-center rounded-full bg-[#6254f3] text-xs font-bold text-white sm:size-8 sm:text-sm">
              {step}
            </span>
            <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">
              {title}
            </h3>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs md:text-sm">
              {description}
            </p>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl border border-border/60 bg-muted/20 p-3 sm:mt-8 sm:p-5 md:p-6">
        <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
          Example order progress
        </p>
        <OrderProgressTimeline status="processing" />
      </div>

      <div className="mt-6 flex justify-center sm:mt-8">
        <Button render={<Link href="/track-order" />} className={PRIMARY_BUTTON_CLASS}>
          Track an order
        </Button>
      </div>
    </SectionShell>
  );
}

export function AboutSupportSection() {
  return (
    <SectionShell className="bg-muted/20">
      <AboutSectionHeader
        badge="Support"
        badgeIcon={Headphones}
        title="Customer Support"
        description="Get help through AI voice assistance and our support team for orders, payments, products, and delivery updates."
      />
      <div className={ABOUT_CARD_GRID_CLASS}>
        {SUPPORT_CHANNELS.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <CardContent className="flex flex-col p-3 sm:p-4">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl">
                <Icon className="size-4 sm:size-5" />
              </span>
              <h3 className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">
                {title}
              </h3>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground sm:text-xs md:text-sm md:leading-relaxed">
                {description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 border-border/60 bg-card shadow-sm sm:mt-8">
        <CardContent className="p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground">
            We can help you with
          </h3>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SUPPORT_TOPICS.map((topic) => (
              <li
                key={topic}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <HelpCircle className="size-4 shrink-0 text-[#6254f3]" />
                {topic}
              </li>
            ))}
          </ul>
          <Button
            render={<Link href="/contact" />}
            variant="outline"
            className={`mt-6 ${OUTLINE_BUTTON_CLASS}`}
          >
            Contact support
          </Button>
        </CardContent>
      </Card>
    </SectionShell>
  );
}
