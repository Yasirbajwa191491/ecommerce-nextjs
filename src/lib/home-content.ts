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
    id: "wellness-sale",
    eyebrow: "Wellness Sale",
    title: "Up To 30% Off",
    description: "Limited-time savings on vitamins, OTC medicines, and healthcare essentials.",
    ctaLabel: "Browse Medicines",
    ctaHref: "/products",
    variant: "primary",
  },
  {
    id: "free-shipping",
    eyebrow: "Free Shipping",
    title: "On Orders Above $100",
    description: "Look for the free shipping badge on eligible healthcare products.",
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
    title: "Trusted Healthcare Products",
    description: "Carefully curated medicines and wellness products with accurate listings.",
    icon: Sparkles,
  },
  {
    title: "AI + Human Support",
    description:
      "AI voice assistant helps you find medicines and creates support requests, backed by our responsive team.",
    icon: Headphones,
  },
];

/** Category image fallbacks when no product sample exists — keyed by slug. */
export const CATEGORY_IMAGE_FALLBACKS: Record<string, string> = {
  "otc-medicines":
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
  medicines:
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
  "vitamins-supplements":
    "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80",
  vitamins:
    "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=600&q=80",
  "personal-care":
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80",
  "medical-devices":
    "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80",
  "healthcare-essentials":
    "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=600&q=80",
  "baby-care":
    "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=600&q=80",
  "diabetes-care":
    "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80",
  "first-aid":
    "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=600&q=80",
  "skin-care":
    "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=600&q=80",
  "pain-relief":
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
  "heart-health":
    "https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80",
};

export const DEFAULT_CATEGORY_IMAGE =
  "https://images.unsplash.com/photo-1576602976047-174e57a47881?auto=format&fit=crop&w=600&q=80";

export const CONVERSION_TRUST_STRIP = [
  { icon: ShieldCheck, label: "Secure Checkout" },
  { icon: CreditCard, label: "Stripe Payments" },
  { icon: Package, label: "Order Tracking" },
  { icon: Headphones, label: "AI Voice Support" },
] as const;
