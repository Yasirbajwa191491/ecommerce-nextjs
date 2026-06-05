"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { STORE_NAME } from "@/lib/site";

const HERO_FALLBACK_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=800&q=80",
    alt: "Modern living room furniture",
  },
  {
    src: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
    alt: "Minimal home decor",
  },
  {
    src: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=700&q=80",
    alt: "Contemporary sofa set",
  },
] as const;

const TRUST_ITEMS = [
  { icon: Truck, label: "Free shipping on select orders" },
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: Sparkles, label: "Curated quality products" },
] as const;

const PAGE_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

type HeroSectionProps = {
  title?: string;
};

export default function HeroSection({ title = STORE_NAME }: HeroSectionProps) {
  const featured = useQuery(api.products.featured) ?? [];

  const showcaseImages =
    featured.length > 0
      ? featured.slice(0, 3).map((product) => ({
          src: product.image[0]?.url ?? HERO_FALLBACK_IMAGES[0].src,
          alt: product.name,
          href: `/singleproduct/${product._id}`,
        }))
      : HERO_FALLBACK_IMAGES.map((image) => ({
          src: image.src,
          alt: image.alt,
          href: "/products",
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
        className="relative mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 md:grid-cols-2 md:gap-8 md:py-16 lg:gap-12 lg:py-20 xl:py-24"
        style={PAGE_GUTTER}
      >
        <div className="flex flex-col items-center text-center text-white md:items-start md:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-white/90 uppercase backdrop-blur-sm sm:text-xs">
            <Sparkles className="size-3.5 text-[#a99bfa]" />
            Welcome to
          </span>

          <h1 className="mt-4 max-w-xl text-3xl font-bold tracking-tight text-white sm:mt-5 sm:text-4xl md:text-[2.75rem] md:leading-[1.1] lg:text-[3.25rem] lg:leading-[1.08]">
            {title}
          </h1>

          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75 sm:mt-4 sm:text-base md:text-lg">
            Discover thoughtfully curated furniture, electronics, and lifestyle
            essentials — handpicked for modern homes and workspaces.
          </p>

          <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:mt-8 sm:max-w-none sm:flex-row sm:justify-center md:justify-start">
            <Button
              render={<Link href="/products" />}
              size="lg"
              className="h-11 w-full gap-2 rounded-full bg-[#6254f3] px-7 text-sm font-semibold text-white shadow-lg shadow-[#6254f3]/30 hover:bg-[#5548e0] sm:h-12 sm:w-auto sm:px-8 sm:text-base"
            >
              Shop Now
              <ArrowRight className="size-4" />
            </Button>
            <Button
              render={<Link href="/products" />}
              variant="outline"
              size="lg"
              className="h-11 w-full rounded-full border-white/25 bg-white/5 px-7 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:h-12 sm:w-auto sm:px-8 sm:text-base"
            >
              Explore catalog
            </Button>
          </div>

          <ul className="mt-6 flex w-full max-w-xl flex-col gap-2 sm:mt-8 md:max-w-none lg:max-w-lg">
            {TRUST_ITEMS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center justify-center gap-2.5 text-left text-xs text-white/70 sm:text-sm md:justify-start"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-[#a99bfa]">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md md:max-w-none md:justify-self-end lg:max-w-xl">
          <div className="relative aspect-[5/4] w-full sm:aspect-[6/5] md:aspect-[5/4] lg:aspect-[6/5]">
            <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-[#6254f3]/20 to-cyan-400/10 blur-3xl sm:rounded-[2rem]" />

            <Link
              href={showcaseImages[0]?.href ?? "/products"}
              className="group absolute top-0 left-0 z-20 h-[56%] w-[64%] overflow-hidden rounded-2xl border border-white/15 shadow-2xl shadow-black/40 transition-transform duration-500 hover:scale-[1.02] sm:h-[58%] sm:w-[62%] sm:rounded-3xl md:h-[60%]"
            >
              <Image
                src={showcaseImages[0]?.src ?? HERO_FALLBACK_IMAGES[0].src}
                alt={showcaseImages[0]?.alt ?? "Featured product"}
                fill
                priority
                sizes="(max-width: 768px) 55vw, (max-width: 1024px) 40vw, 380px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1435]/50 via-transparent to-transparent" />
            </Link>

            <Link
              href={showcaseImages[1]?.href ?? "/products"}
              className="group absolute top-[6%] right-0 z-10 h-[40%] w-[46%] overflow-hidden rounded-xl border border-white/15 shadow-xl shadow-black/30 transition-transform duration-500 hover:scale-[1.02] sm:top-[8%] sm:h-[42%] sm:w-[48%] sm:rounded-2xl"
            >
              <Image
                src={showcaseImages[1]?.src ?? HERO_FALLBACK_IMAGES[1].src}
                alt={showcaseImages[1]?.alt ?? "Featured product"}
                fill
                sizes="(max-width: 768px) 38vw, 260px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>

            <Link
              href={showcaseImages[2]?.href ?? "/products"}
              className="group absolute right-[4%] bottom-0 z-30 h-[44%] w-[54%] overflow-hidden rounded-xl border border-white/15 shadow-2xl shadow-black/35 transition-transform duration-500 hover:scale-[1.02] sm:right-[6%] sm:h-[46%] sm:w-[52%] sm:rounded-2xl"
            >
              <Image
                src={showcaseImages[2]?.src ?? HERO_FALLBACK_IMAGES[2].src}
                alt={showcaseImages[2]?.alt ?? "Featured product"}
                fill
                sizes="(max-width: 768px) 42vw, 280px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </Link>

            <div className="absolute bottom-[10%] left-[2%] z-40 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 backdrop-blur-md sm:bottom-[12%] sm:left-[4%] sm:rounded-2xl sm:px-4 sm:py-3">
              <p className="text-[9px] font-semibold tracking-wider text-white/60 uppercase sm:text-[10px]">
                New arrivals
              </p>
              <p className="mt-0.5 text-xs font-semibold text-white sm:text-sm">
                Premium picks, daily
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-t border-white/8 bg-white/[0.03]">
        <div
          className="mx-auto grid w-full max-w-[1600px] grid-cols-3 gap-3 px-4 py-5 sm:gap-6 sm:py-6"
          style={PAGE_GUTTER}
        >
          {[
            { value: "500+", label: "Quality products" },
            { value: "24/7", label: "Online shopping" },
            { value: "100%", label: "Secure payments" },
          ].map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="text-lg font-bold text-white sm:text-xl lg:text-2xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-white/55 sm:text-xs lg:text-sm">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
