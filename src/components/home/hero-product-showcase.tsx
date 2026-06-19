"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type Transition,
} from "framer-motion";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { formatCurrencyAmount } from "@/lib/currencies";
import { EASE_PREMIUM } from "@/lib/motion";
import {
  HERO_CARD_PRICE,
  HERO_CARD_PRICE_COMPACT,
  HERO_CARD_PRODUCT_NAME,
  HERO_CARD_PRODUCT_NAME_COMPACT,
  SHOP_BADGE,
} from "@/lib/typography";
import { calculateFinalPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type HeroShowcaseProduct = {
  id: string;
  href: string;
  name: string;
  image: string;
  price: number;
  discountPercent: number;
  currency: string;
};

type HeroProductShowcaseProps = {
  products: HeroShowcaseProduct[];
};

const ROTATION_MS = 6500;
const MD_BREAKPOINT = "(min-width: 768px)";

function useIsMdUp() {
  const [isMdUp, setIsMdUp] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MD_BREAKPOINT);
    const update = () => setIsMdUp(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMdUp;
}

function HeroProductCardShell({
  product,
  priority = false,
  featured = false,
}: {
  product: HeroShowcaseProduct;
  priority?: boolean;
  featured?: boolean;
}) {
  return (
    <Link href={product.href} className="group block" aria-label={`View ${product.name}`}>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-2xl backdrop-blur-xl",
          "transition-[box-shadow,border-color] duration-300",
          featured
            ? "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] group-active:border-white/28"
            : "shadow-[0_24px_48px_-16px_rgba(0,0,0,0.5)] group-active:border-white/25"
        )}
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/5">
          <Image
            src={product.image}
            alt={product.name}
            fill
            priority={priority}
            sizes="(max-width: 768px) 86vw, 260px"
            className="object-cover object-center transition-transform duration-500 group-active:scale-[1.02]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1435]/70 via-[#0a1435]/10 to-transparent" />
          {product.discountPercent > 0 ? (
            <span
              className={cn(
                "absolute top-3 left-3 rounded-full bg-[#6254f3] px-2.5 py-0.5 text-white shadow-lg",
                SHOP_BADGE
              )}
            >
              −{product.discountPercent}%
            </span>
          ) : null}
        </div>
        <div className="border-t border-white/10 bg-[#0a1435]/80 px-4 py-3.5 backdrop-blur-md sm:px-5 sm:py-4">
          <p className={HERO_CARD_PRODUCT_NAME}>{product.name}</p>
          {product.price > 0 ? (
            <div className="mt-1.5">
              <HeroCardPrice
                price={product.price}
                discountPercent={product.discountPercent}
                currency={product.currency}
              />
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

type SatelliteSlot = "top-right" | "bottom-left" | "bottom-right";

const SATELLITE_SLOTS: Record<
  SatelliteSlot,
  { className: string; floatDuration: number; floatDelay: number }
> = {
  "top-right": {
    className: "right-[2%] top-[3%] z-30 md:right-[4%] md:top-[2%]",
    floatDuration: 5.5,
    floatDelay: 0.2,
  },
  "bottom-left": {
    className: "bottom-[6%] left-0 z-20 md:bottom-[8%] md:left-[2%]",
    floatDuration: 6.2,
    floatDelay: 0.5,
  },
  "bottom-right": {
    className: "right-0 bottom-0 z-[25] md:right-[2%] md:bottom-[2%] lg:block",
    floatDuration: 5.8,
    floatDelay: 0.35,
  },
};

function HeroCardPrice({
  price,
  discountPercent,
  currency,
  compact = false,
}: {
  price: number;
  discountPercent: number;
  currency: string;
  compact?: boolean;
}) {
  const hasDiscount = discountPercent > 0;
  const finalPrice = hasDiscount
    ? calculateFinalPrice(price, discountPercent)
    : price;

  return (
    <div className="flex flex-wrap items-baseline gap-1.5">
      <span
        className={cn(
          compact ? HERO_CARD_PRICE_COMPACT : HERO_CARD_PRICE
        )}
      >
        {formatCurrencyAmount(finalPrice, currency)}
      </span>
      {hasDiscount ? (
        <span
          className={cn(
            "text-white/45 line-through",
            compact ? "text-xs sm:text-sm" : "text-sm sm:text-base"
          )}
        >
          {formatCurrencyAmount(price, currency)}
        </span>
      ) : null}
    </div>
  );
}

function ShowcaseProductCard({
  product,
  variant,
  slot,
  entranceDelay = 0,
  priority = false,
  isRotating = false,
  parallaxRotateX,
  parallaxRotateY,
}: {
  product: HeroShowcaseProduct;
  variant: "featured" | "satellite";
  slot?: SatelliteSlot;
  entranceDelay?: number;
  priority?: boolean;
  isRotating?: boolean;
  parallaxRotateX?: MotionValue<number>;
  parallaxRotateY?: MotionValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const isFeatured = variant === "featured";
  const slotConfig = slot ? SATELLITE_SLOTS[slot] : null;

  const entrance: Transition = {
    duration: isRotating ? 0.45 : 0.55,
    delay: isRotating ? 0 : entranceDelay,
    ease: EASE_PREMIUM,
  };

  const floatTransition: Transition = {
    duration: slotConfig?.floatDuration ?? 6,
    delay: (slotConfig?.floatDelay ?? 0) + entranceDelay,
    repeat: Infinity,
    ease: "easeInOut",
  };

  const floatY = isFeatured ? [-3, 3, -3] : [-5, 5, -5];

  return (
    <m.div
      className={cn(
        "absolute",
        isFeatured
          ? "left-1/2 top-1/2 z-20 w-[min(240px,56%)] -translate-x-1/2 -translate-y-[52%] sm:w-[min(260px,54%)] md:-translate-y-1/2"
          : cn(
              "w-[min(132px,34%)] sm:w-[min(148px,32%)]",
              slotConfig?.className,
              slot === "bottom-right" && "hidden lg:block"
            )
      )}
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              scale: 0.92,
              y: isRotating ? (isFeatured ? 14 : 10) : isFeatured ? 24 : 14,
            }
      }
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={
        reduceMotion
          ? undefined
          : {
              opacity: 0,
              scale: 0.94,
              y: isFeatured ? -10 : -6,
              transition: { duration: 0.35, ease: EASE_PREMIUM },
            }
      }
      transition={entrance}
      whileHover={
        reduceMotion
          ? undefined
          : {
              scale: isFeatured ? 1.02 : 1.05,
              transition: { duration: 0.35, ease: EASE_PREMIUM },
            }
      }
      style={{
        willChange: "transform, opacity",
        rotateX: isFeatured && parallaxRotateX && !reduceMotion ? parallaxRotateX : undefined,
        rotateY: isFeatured && parallaxRotateY && !reduceMotion ? parallaxRotateY : undefined,
        perspective: isFeatured ? 800 : undefined,
      }}
    >
      <m.div
        animate={reduceMotion ? undefined : { y: floatY }}
        transition={reduceMotion ? undefined : floatTransition}
        style={{ willChange: "transform" }}
      >
        <Link
          href={product.href}
          className="group block"
          aria-label={`View ${product.name}`}
        >
          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-white/20 bg-white/[0.08] shadow-2xl backdrop-blur-xl",
              "transition-[box-shadow,border-color] duration-300",
              isFeatured
                ? "shadow-[0_32px_64px_-12px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)] group-hover:shadow-[0_40px_72px_-12px_rgba(98,84,243,0.35)] group-hover:border-white/30"
                : "shadow-[0_20px_40px_-16px_rgba(0,0,0,0.5)] group-hover:shadow-[0_28px_48px_-12px_rgba(98,84,243,0.28)] group-hover:border-white/28"
            )}
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-white/5">
              <Image
                src={product.image}
                alt={product.name}
                fill
                priority={priority}
                sizes={
                  isFeatured
                    ? "(max-width: 768px) 56vw, 260px"
                    : "(max-width: 768px) 34vw, 148px"
                }
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1435]/70 via-[#0a1435]/10 to-transparent" />
              {product.discountPercent > 0 ? (
                <span
                  className={cn(
                    "absolute top-2.5 left-2.5 rounded-full bg-[#6254f3] px-2 py-0.5 text-white shadow-lg",
                    SHOP_BADGE
                  )}
                >
                  −{product.discountPercent}%
                </span>
              ) : null}
            </div>
            <div
              className={cn(
                "border-t border-white/10 bg-[#0a1435]/80 backdrop-blur-md",
                isFeatured
                  ? "px-3.5 py-3 sm:px-4 sm:py-3"
                  : "px-2.5 py-2 sm:px-3 sm:py-2.5"
              )}
            >
              <p
                className={
                  isFeatured
                    ? HERO_CARD_PRODUCT_NAME
                    : HERO_CARD_PRODUCT_NAME_COMPACT
                }
              >
                {product.name}
              </p>
              {product.price > 0 ? (
                <div className="mt-1">
                  <HeroCardPrice
                    price={product.price}
                    discountPercent={product.discountPercent}
                    currency={product.currency}
                    compact={!isFeatured}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </Link>
      </m.div>
    </m.div>
  );
}

function DesktopShowcase({
  products,
  featuredIndex,
}: {
  products: HeroShowcaseProduct[];
  featuredIndex: number;
}) {
  const reduceMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const parallaxRotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const parallaxRotateY = useTransform(mouseX, [-0.5, 0.5], [-3, 3]);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const count = products.length;
  const featured = products[featuredIndex]!;
  const satelliteSlots: SatelliteSlot[] = [
    "top-right",
    "bottom-left",
    "bottom-right",
  ];

  const satellites = satelliteSlots.map((slot, i) => ({
    slot,
    product: products[(featuredIndex + 1 + i) % count]!,
  }));

  return (
    <div
      className="relative mx-auto aspect-[4/5] w-full max-w-[420px] lg:max-w-[460px]"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="pointer-events-none absolute inset-[8%] rounded-full bg-[#6254f3]/25 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[18%] left-[22%] size-24 rounded-full bg-cyan-400/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[18%] bottom-[20%] size-20 rounded-full bg-[#6254f3]/20 blur-2xl"
        aria-hidden
      />

      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE_PREMIUM }}
        className={cn(
          "pointer-events-none absolute top-[6%] right-[8%] z-40 flex items-center gap-1.5 rounded-full border border-white/15 bg-[#6254f3]/90 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm",
          SHOP_BADGE
        )}
      >
        <Sparkles className="size-3" />
        Featured
      </m.div>

      <AnimatePresence mode="wait">
        <ShowcaseProductCard
          key={`featured-${featured.id}-${featuredIndex}`}
          product={featured}
          variant="featured"
          entranceDelay={0.08}
          priority
          isRotating={featuredIndex > 0}
          parallaxRotateX={parallaxRotateX}
          parallaxRotateY={parallaxRotateY}
        />
      </AnimatePresence>

      {satellites.map(({ slot, product }, index) => (
        <AnimatePresence key={slot} mode="wait">
          <ShowcaseProductCard
            key={`${slot}-${product.id}-${featuredIndex}`}
            product={product}
            variant="satellite"
            slot={slot}
            entranceDelay={0.18 + index * 0.1}
            isRotating={featuredIndex > 0}
          />
        </AnimatePresence>
      ))}
    </div>
  );
}

function MobileShowcaseCarousel({
  products,
}: {
  products: HeroShowcaseProduct[];
}) {
  const reduceMotion = useReducedMotion();
  const isMdUp = useIsMdUp();
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;

    const onSelect = () => {
      setSelectedIndex(carouselApi.selectedScrollSnap());
    };

    onSelect();
    carouselApi.on("select", onSelect);
    carouselApi.on("reInit", onSelect);

    return () => {
      carouselApi.off("select", onSelect);
      carouselApi.off("reInit", onSelect);
    };
  }, [carouselApi]);

  useEffect(() => {
    if (reduceMotion || isMdUp || products.length <= 1 || !carouselApi) return;

    const timer = window.setInterval(() => {
      carouselApi.scrollNext();
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [carouselApi, isMdUp, products.length, reduceMotion]);

  return (
    <div className="relative w-full md:hidden">
      <div
        className="pointer-events-none absolute top-[12%] left-1/2 z-0 h-48 w-[min(100%,280px)] -translate-x-1/2 rounded-full bg-[#6254f3]/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[8%] bottom-[18%] z-0 size-24 rounded-full bg-cyan-400/10 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 mb-4 flex items-center justify-between gap-3 px-1">
        <m.div
          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: EASE_PREMIUM }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[#6254f3]/90 px-3 py-1.5 text-white shadow-lg backdrop-blur-sm",
            SHOP_BADGE
          )}
        >
          <Sparkles className="size-3" />
          Featured
        </m.div>
        <p className="text-sm font-medium tracking-wide text-white/50 tabular-nums">
          {selectedIndex + 1} / {products.length}
        </p>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute inset-y-6 left-0 z-10 w-6 bg-gradient-to-r from-[#0a1435] to-transparent sm:w-8"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-6 right-0 z-10 w-6 bg-gradient-to-l from-[#0a1435] to-transparent sm:w-8"
          aria-hidden
        />

        <Carousel
          setApi={setCarouselApi}
          opts={{ align: "center", loop: products.length > 1, containScroll: "trimSnaps" }}
          className="w-full"
        >
          <CarouselContent className="-ml-3">
            {products.map((product, index) => {
              const isActive = selectedIndex === index;

              return (
                <CarouselItem
                  key={product.id}
                  className="basis-[86%] pl-3 sm:basis-[78%]"
                >
                  <m.div
                    initial={reduceMotion ? false : { opacity: 0, y: 20, scale: 0.96 }}
                    animate={{
                      opacity: isActive ? 1 : 0.45,
                      y: 0,
                      scale: isActive ? 1 : 0.92,
                    }}
                    transition={{
                      opacity: { duration: 0.35, ease: EASE_PREMIUM },
                      scale: { duration: 0.35, ease: EASE_PREMIUM },
                      y: {
                        delay: index * 0.06,
                        duration: 0.5,
                        ease: EASE_PREMIUM,
                      },
                    }}
                    className="mx-auto w-full max-w-[300px] will-change-transform"
                  >
                    <HeroProductCardShell
                      product={product}
                      priority={index === 0}
                      featured={isActive}
                    />
                  </m.div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </div>

      {products.length > 1 ? (
        <div className="mt-5 flex items-center justify-center gap-2">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              aria-label={`Go to slide ${index + 1}: ${product.name}`}
              aria-current={selectedIndex === index ? "true" : undefined}
              onClick={() => carouselApi?.scrollTo(index)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-out",
                selectedIndex === index
                  ? "w-7 bg-[#6254f3] shadow-[0_0_12px_rgba(98,84,243,0.55)]"
                  : "w-1.5 bg-white/25 hover:bg-white/40"
              )}
            />
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-center text-sm font-medium tracking-wide text-white/40">
        Swipe to explore featured products
      </p>
    </div>
  );
}

export function HeroProductShowcase({ products }: HeroProductShowcaseProps) {
  const reduceMotion = useReducedMotion();
  const isMdUp = useIsMdUp();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const count = products.length;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const advanceFeatured = useCallback(() => {
    if (count <= 1) return;
    setFeaturedIndex((current) => (current + 1) % count);
  }, [count]);

  useEffect(() => {
    if (!hasMounted || !isMdUp || reduceMotion || count <= 1) return;
    const timer = window.setInterval(advanceFeatured, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [advanceFeatured, count, hasMounted, isMdUp, reduceMotion]);

  const safeIndex = useMemo(
    () => (count > 0 ? featuredIndex % count : 0),
    [count, featuredIndex]
  );

  if (count === 0) {
    return (
      <div className="flex aspect-[4/5] w-full max-w-md items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 md:max-w-none">
        <p className="text-sm text-white/60">Featured products loading…</p>
      </div>
    );
  }

  return (
    <div className="relative w-full pb-4 md:justify-self-end md:pb-6">
      <div className="md:hidden">
        <MobileShowcaseCarousel products={products} />
      </div>
      <div className="hidden md:block">
        <DesktopShowcase products={products} featuredIndex={safeIndex} />
      </div>
    </div>
  );
}
