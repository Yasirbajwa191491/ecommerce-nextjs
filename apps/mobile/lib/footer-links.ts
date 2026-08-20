import type { Href } from "expo-router";

export type FooterLink = {
  label: string;
  href: Href;
};

export const FOOTER_SHOP_LINKS: readonly FooterLink[] = [
  { label: "All Products", href: "/(tabs)/shop" },
  { label: "Categories", href: "/(tabs)/shop" },
  { label: "Best Sellers", href: "/(tabs)/shop" },
  { label: "Promotions", href: "/(tabs)/shop" },
];

export const FOOTER_SUPPORT_LINKS: readonly FooterLink[] = [
  { label: "Contact", href: "/contact" },
  { label: "Track Order", href: "/(tabs)/track" },
  { label: "Shipping", href: "/shipping" },
  { label: "Returns", href: "/return" },
  { label: "FAQ", href: "/about" },
];

export const FOOTER_COMPANY_LINKS: readonly FooterLink[] = [
  { label: "About", href: "/about" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export const FOOTER_AI_LINKS: readonly FooterLink[] = [
  { label: "AI Shopping Assistant", href: "/(tabs)/ai" },
  { label: "Visual Search", href: "/visual-search" },
  { label: "Recommendations", href: "/(tabs)" },
];

export const FOOTER_NAV_GROUPS = [
  { id: "shop", title: "Shop", links: FOOTER_SHOP_LINKS },
  { id: "support", title: "Customer Support", links: FOOTER_SUPPORT_LINKS },
  { id: "company", title: "Company", links: FOOTER_COMPANY_LINKS },
  { id: "ai", title: "AI Shopping", links: FOOTER_AI_LINKS },
] as const;

/** Payment options actually supported by mobile checkout. */
export const MOBILE_PAYMENT_METHODS = ["Card (Stripe)", "Cash on delivery"] as const;
