import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Headphones,
  Package,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";

export type PromoBanner = {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  ctaLabel: string;
  ctaHref: string;
  variant: "primary" | "secondary";
};

export type TrustFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

/** Static promo banners — future: load from admin settings. */
export const PROMO_BANNERS: PromoBanner[] = [
  {
    id: "summer-sale",
    eyebrow: "Summer Sale",
    title: "Up To 30% Off",
    description: "Limited-time savings on curated favorites across the store.",
    ctaLabel: "Shop Now",
    ctaHref: "/products",
    variant: "primary",
  },
  {
    id: "free-shipping",
    eyebrow: "Free Shipping",
    title: "On Orders Above $100",
    description: "Look for the free shipping badge on eligible products.",
    ctaLabel: "Browse Deals",
    ctaHref: "/products",
    variant: "secondary",
  },
];

export const HERO_TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Secure Payments" },
  { icon: Truck, label: "Fast Delivery" },
  { icon: RotateCcw, label: "Easy Returns" },
  { icon: Sparkles, label: "Quality Guaranteed" },
] as const;

export const WHY_CHOOSE_US_FEATURES: TrustFeature[] = [
  {
    title: "Secure Payments",
    description: "Stripe-powered checkout with industry-standard encryption.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Delivery",
    description: "Reliable shipping with real-time order tracking updates.",
    icon: Truck,
  },
  {
    title: "Quality Products",
    description: "Carefully curated catalog with accurate listings and photos.",
    icon: Sparkles,
  },
  {
    title: "AI + Human Support",
    description:
      "AI voice assistant captures user info and creates support requests, backed by our responsive team.",
    icon: Headphones,
  },
];

/** Category image fallbacks when no product sample exists — keyed by slug. */
export const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  electronics:
    "https://images.unsplash.com/photo-1498049794561-7780f7231661?auto=format&fit=crop&w=600&q=80",
  furniture:
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=600&q=80",
  fashion:
    "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=600&q=80",
  jewelry:
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80",
  office:
    "https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=600&q=80",
  kitchen:
    "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=600&q=80",
  living:
    "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=600&q=80",
  "home-decor":
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80",
};

export const DEFAULT_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80";

/** Placeholder brand logos — future: load from admin settings / CMS. */
export type BrandPlaceholder = {
  name: string;
  slug: string;
};

export const PLACEHOLDER_BRANDS: BrandPlaceholder[] = [
  { name: "IKEA", slug: "ikea" },
  { name: "Home Centre", slug: "home-centre" },
  { name: "ErgoSeat", slug: "ergoseat" },
  { name: "Lux Lighting", slug: "lux-lighting" },
  { name: "WoodCraft", slug: "woodcraft" },
  { name: "TechPro", slug: "techpro" },
];

export const CONVERSION_TRUST_STRIP = [
  { icon: ShieldCheck, label: "Secure Checkout" },
  { icon: CreditCard, label: "Stripe Payments" },
  { icon: Package, label: "Order Tracking" },
  { icon: Headphones, label: "AI Voice Support" },
] as const;
