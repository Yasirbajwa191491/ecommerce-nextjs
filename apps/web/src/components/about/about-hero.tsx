"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { AboutImage } from "@/components/about/about-image";
import { Button } from "@/components/ui/button";
import { ABOUT_HERO } from "@/lib/about-content";
import {
  OUTLINE_BUTTON_CLASS,
  PAGE_GUTTER,
  PRIMARY_BUTTON_CLASS,
  SECTION_PADDING_Y,
} from "@/lib/layout-constants";
import { SHOP_EYEBROW, SHOP_PAGE_LEAD, SHOP_PAGE_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function AboutHero() {
  return (
    <section className="border-b border-border/60 bg-background">
      <div
        className={cn("mx-auto w-full max-w-[1600px]", SECTION_PADDING_Y)}
        style={PAGE_GUTTER}
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <span className={SHOP_EYEBROW}>
              <Info className="size-3.5 sm:size-4" />
              {ABOUT_HERO.badge}
            </span>
            <h1 className={cn("mt-4", SHOP_PAGE_TITLE)}>{ABOUT_HERO.title}</h1>
            <p className={cn("mx-auto mt-3 max-w-2xl lg:mx-0", SHOP_PAGE_LEAD)}>
              {ABOUT_HERO.description}
            </p>
            <div
              className={cn(
                "mt-6 flex flex-row flex-wrap items-center justify-center gap-3 lg:justify-start"
              )}
            >
              <Button
                render={<Link href="/products" />}
                className={PRIMARY_BUTTON_CLASS}
              >
                Shop Now
                <ArrowRight className="size-4" />
              </Button>
              <Button
                render={<Link href="/contact" />}
                variant="outline"
                className={OUTLINE_BUTTON_CLASS}
              >
                Contact Us
              </Button>
            </div>
          </div>

          <AboutImage
            src={ABOUT_HERO.image.src}
            alt={ABOUT_HERO.image.alt}
            priority
            className="mx-auto max-w-xl shadow-lg lg:max-w-none"
          />
        </div>
      </div>
    </section>
  );
}
