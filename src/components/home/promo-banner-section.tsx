"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaggerGroup, StaggerItem } from "@/components/home/scroll-reveal";
import { PROMO_BANNERS } from "@/lib/home-content";
import {
  PAGE_GUTTER,
  PRIMARY_BUTTON_CLASS,
  SURFACE_BUTTON_CLASS,
} from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

export function PromoBannerSection() {
  return (
    <section className="bg-background py-8 sm:py-10 md:py-12">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <StaggerGroup className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:gap-6">
          {PROMO_BANNERS.map((banner, index) => (
            <StaggerItem
              key={banner.id}
              index={index}
              variant={index === 0 ? "left" : "right"}
            >
              <div
                className={cn(
                  "group relative overflow-hidden rounded-2xl border p-5 transition-shadow duration-500 sm:p-7 md:p-8 lg:p-10",
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
                <div className="relative max-w-md">
                  <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-80 sm:text-xs">
                    {banner.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight transition-transform duration-500 group-hover:-translate-y-0.5 sm:text-2xl md:text-3xl">
                    {banner.title}
                  </h3>
                  {banner.description ? (
                    <p className="mt-2 text-sm leading-relaxed opacity-85 sm:mt-3 sm:text-base">
                      {banner.description}
                    </p>
                  ) : null}
                  <Button
                    render={<Link href={banner.ctaHref} />}
                    variant="outline"
                    className={cn(
                      "mt-4 transition-transform duration-300 group-hover:scale-[1.02] sm:mt-5",
                      banner.variant === "primary"
                        ? SURFACE_BUTTON_CLASS
                        : PRIMARY_BUTTON_CLASS
                    )}
                  >
                    {banner.ctaLabel}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
