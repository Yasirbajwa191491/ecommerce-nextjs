"use client";

import Link from "next/link";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { PROMO_BANNERS } from "@/lib/home-content";
import {
  PAGE_GUTTER,
  PRIMARY_BUTTON_CLASS,
  HOME_SECTION_PADDING_Y,
  SURFACE_BUTTON_CLASS,
} from "@/lib/layout-constants";
import { SHOP_BADGE, SHOP_HERO_LEAD } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function PromoBannerSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section className={cn("bg-background", HOME_SECTION_PADDING_Y)}>
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <StaggerGroup className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
          {PROMO_BANNERS.map((banner, index) => (
            <StaggerItem
              key={banner.id}
              index={index}
              variant={index === 0 ? "left" : "right"}
              className="h-full w-full"
            >
              <m.div
                whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "group relative flex h-full min-h-[12.5rem] flex-col overflow-hidden rounded-2xl border p-5 transition-shadow duration-500 sm:min-h-[14rem] sm:p-7 md:p-8 lg:p-10",
                  "hover:shadow-xl",
                  banner.variant === "primary"
                    ? "border-[#6254f3]/20 bg-gradient-to-br from-[#6254f3] to-[#4f46e5] text-white shadow-lg shadow-[#6254f3]/20 hover:shadow-[#6254f3]/25"
                    : "border-border/60 bg-[#0a1435] text-white hover:shadow-black/30"
                )}
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-20 transition-opacity duration-500 group-hover:opacity-30"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)",
                  }}
                />
                <div className="relative flex max-w-md flex-1 flex-col">
                  <p className={cn(SHOP_BADGE, "tracking-[0.2em] opacity-80")}>
                    {banner.eyebrow}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold tracking-tight transition-transform duration-500 group-hover:-translate-y-0.5 sm:text-3xl md:text-4xl">
                    {banner.title}
                  </h3>
                  {banner.description ? (
                    <p className={cn("mt-2 opacity-85 sm:mt-3", SHOP_HERO_LEAD)}>
                      {banner.description}
                    </p>
                  ) : null}
                  <m.div
                    className="mt-auto pt-4 sm:pt-5"
                    whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                  >
                    <Button
                      render={<Link href={banner.ctaHref} />}
                      variant="outline"
                      className={cn(
                        "mt-0",
                        banner.variant === "primary"
                          ? SURFACE_BUTTON_CLASS
                          : PRIMARY_BUTTON_CLASS
                      )}
                    >
                      {banner.ctaLabel}
                      <ArrowRight className="size-4" />
                    </Button>
                  </m.div>
                </div>
              </m.div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
