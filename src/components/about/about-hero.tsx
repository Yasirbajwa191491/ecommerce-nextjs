"use client";

import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { AboutImage } from "@/components/about/about-image";
import { Button } from "@/components/ui/button";
import { ABOUT_HERO } from "@/lib/about-content";
import {
  BUTTON_ROW_CLASS,
  OUTLINE_BUTTON_CLASS,
  PAGE_GUTTER,
  PRIMARY_BUTTON_CLASS,
} from "@/lib/layout-constants";

export function AboutHero() {
  return (
    <section className="border-b border-border/60 bg-background">
      <div
        className="mx-auto w-full max-w-[1600px] py-8 sm:py-10 md:py-12 lg:py-14"
        style={PAGE_GUTTER}
      >
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-none lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#6254f3] uppercase sm:text-xs">
              <Info className="size-3.5" />
              {ABOUT_HERO.badge}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem] md:leading-tight">
              {ABOUT_HERO.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
              {ABOUT_HERO.description}
            </p>
            <div className={`mt-6 ${BUTTON_ROW_CLASS}`}>
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
