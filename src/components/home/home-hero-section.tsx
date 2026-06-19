"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { m, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Percent } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  HeroProductShowcase,
  type HeroShowcaseProduct,
} from "@/components/home/hero-product-showcase";
import { HERO_TRUST_ITEMS } from "@/lib/home-content";
import {
  BUTTON_ROW_CLASS,
  HERO_GHOST_BUTTON_CLASS,
  HERO_PRIMARY_BUTTON_CLASS,
  PAGE_GUTTER,
} from "@/lib/layout-constants";
import { getPrimaryImageUrl } from "@/lib/product-images";
import { productPath } from "@/lib/product-url";
import { fadeIn, fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import {
  SHOP_HERO_BADGE,
  SHOP_HERO_FEATURE,
  SHOP_HERO_LEAD,
  SHOP_HERO_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

const HERO_FALLBACK_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80",
    alt: "Modern living room furniture",
    price: 36000,
    discountPercent: 20,
  },
  {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    alt: "Ergonomic office chair",
    price: 15000,
    discountPercent: 0,
  },
  {
    src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80",
    alt: "Contemporary bedside table",
    price: 8999,
    discountPercent: 10,
  },
  {
    src: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80",
    alt: "Gold bracelet",
    price: 2499,
    discountPercent: 15,
  },
] as const;

export function HomeHeroSection() {
  const featured = useQuery(api.products.featured);
  const reduceMotion = useReducedMotion();

  const showcaseProducts: HeroShowcaseProduct[] =
    featured && featured.length > 0
      ? featured.slice(0, 8).map((product) => ({
          id: product._id,
          href: productPath(product._id),
          name: product.name,
          image: getPrimaryImageUrl(product, HERO_FALLBACK_IMAGES[0].src),
          price: product.price,
          discountPercent: product.discountPercent ?? 0,
          currency: product.currency ?? "USD",
        }))
      : HERO_FALLBACK_IMAGES.map((image, index) => ({
          id: `fallback-${index}`,
          href: "/products",
          name: image.alt,
          image: image.src,
          price: image.price,
          discountPercent: image.discountPercent,
          currency: "USD",
        }));

  return (
    <section className="relative overflow-hidden bg-[#0a1435]">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(98,84,243,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 85% 20%, rgba(56,189,248,0.18) 0%, transparent 50%), linear-gradient(135deg, #0a1435 0%, #121b42 45%, #0f1638 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <div
        className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-6 sm:gap-8 md:grid-cols-2 md:gap-10 lg:gap-14"
        style={PAGE_GUTTER}
      >
        <m.div
          className="flex flex-col items-center pb-6 pt-10 text-center text-white sm:pb-8 sm:pt-12 md:items-start md:py-16 md:pb-16 md:text-left lg:py-20"
          initial={reduceMotion ? false : "hidden"}
          animate="visible"
          variants={staggerContainer(0.1, 0.05)}
        >
          <m.span variants={fadeUp} className={SHOP_HERO_BADGE}>
            <Percent className="size-4 text-[#a99bfa] sm:size-[1.125rem]" />
            Up To 40% Off
          </m.span>

          <m.h1
            variants={fadeUp}
            className={cn("mt-4 max-w-xl text-white sm:mt-5", SHOP_HERO_TITLE)}
          >
            Discover Premium Products For Your Lifestyle
          </m.h1>

          <m.p variants={fadeIn} className={cn("mt-4 max-w-lg", SHOP_HERO_LEAD)}>
            Shop curated furniture, electronics, and essentials with secure
            checkout, fast delivery, and quality you can trust.
          </m.p>

          <m.div
            variants={fadeUp}
            className={`mt-6 sm:mt-7 ${BUTTON_ROW_CLASS} md:justify-start`}
          >
            <m.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
              <Button
                render={<Link href="/products" />}
                className={HERO_PRIMARY_BUTTON_CLASS}
              >
                Shop Now
                <ArrowRight />
              </Button>
            </m.div>
            <m.div whileHover={reduceMotion ? undefined : { scale: 1.02 }} whileTap={reduceMotion ? undefined : { scale: 0.98 }}>
              <Button
                render={<Link href="/products" />}
                variant="outline"
                className={HERO_GHOST_BUTTON_CLASS}
              >
                Browse Categories
              </Button>
            </m.div>
          </m.div>

          <m.ul
            variants={staggerContainer(0.06, 0)}
            className="mt-6 grid w-full max-w-xl grid-cols-2 gap-x-4 gap-y-3 sm:mt-8 sm:gap-x-5 sm:gap-y-4 md:max-w-2xl"
          >
            {HERO_TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <m.li
                key={label}
                variants={staggerItem}
                className={cn("flex items-center gap-2.5 text-left sm:gap-3", SHOP_HERO_FEATURE)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#a99bfa] sm:size-10">
                  <Check className="size-4 sm:size-[1.125rem]" />
                </span>
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <Icon className="size-[1.125rem] shrink-0 text-[#a99bfa] sm:size-5" />
                  {label}
                </span>
              </m.li>
            ))}
          </m.ul>
        </m.div>

        <HeroProductShowcase products={showcaseProducts} />
      </div>
    </section>
  );
}
