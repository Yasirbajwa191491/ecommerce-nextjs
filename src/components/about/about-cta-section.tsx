"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ABOUT_CTA } from "@/lib/about-content";
import { BUTTON_ROW_CLASS, PAGE_GUTTER, PRIMARY_BUTTON_CLASS } from "@/lib/layout-constants";
import { SHOP_HERO_LEAD } from "@/lib/typography";
import { cn } from "@/lib/utils";

export function AboutCtaSection() {
  return (
    <section className="relative overflow-hidden bg-[#0a1435] py-12 sm:py-14 md:py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(98,84,243,0.35) 0%, transparent 55%), linear-gradient(135deg, #0a1435 0%, #121b42 45%, #0f1638 100%)",
        }}
      />
      <div
        className="relative mx-auto w-full max-w-[1600px] text-center"
        style={PAGE_GUTTER}
      >
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          {ABOUT_CTA.title}
        </h2>
        <p className={cn("mx-auto mt-4 max-w-2xl", SHOP_HERO_LEAD)}>
          {ABOUT_CTA.description}
        </p>
        <div className={`mt-8 ${BUTTON_ROW_CLASS} justify-center`}>
          <Button
            render={<Link href="/products" />}
            className={`${PRIMARY_BUTTON_CLASS}`}
          >
            Shop Products
            <ArrowRight className="size-4" />
          </Button>
          <Button
            render={<Link href="/contact" />}
            variant="outline"
            className="h-11 w-auto shrink-0 rounded-full border-white/25 bg-white/5 px-8 text-sm font-semibold text-white hover:bg-white/10 hover:text-white"
          >
            Contact Us
          </Button>
        </div>
      </div>
    </section>
  );
}
