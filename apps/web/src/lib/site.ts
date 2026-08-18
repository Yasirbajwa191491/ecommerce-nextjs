import { DEFAULT_STORE_CONTACT, DEFAULT_STORE_NAME } from "@/lib/store-defaults";

export const STORE_NAME = DEFAULT_STORE_NAME;

/** Canonical storefront homepage path. */
export const HOME_PATH = "/home" as const;

export const CONTACT_INFO = {
  address: DEFAULT_STORE_CONTACT.address,
  phone: DEFAULT_STORE_CONTACT.phone,
  phoneHref: "tel:+18005550199",
  email: DEFAULT_STORE_CONTACT.email,
  hours: DEFAULT_STORE_CONTACT.business_hours,
} as const;

export const NAV_LINKS = [
  { href: HOME_PATH, label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track-order", label: "Track Order" },
] as const;

export const FOOTER_SHOP_LINKS = [
  { href: "/products", label: "All Products" },
  { href: "/products", label: "Categories" },
  { href: "/products?sort=popular", label: "Best Sellers" },
  { href: "/promotions", label: "Promotions" },
] as const;

export const FOOTER_SUPPORT_LINKS = [
  { href: "/contact", label: "Contact" },
  { href: "/track-order", label: "Track Order" },
  { href: "/shipping", label: "Shipping" },
  { href: "/return", label: "Returns" },
  { href: "/contact", label: "FAQ" },
] as const;

export const FOOTER_COMPANY_LINKS = [
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const FOOTER_AI_LINKS = [
  { href: "/ai-shopping", label: "AI Shopping Assistant" },
  { href: "/ai-shopping#visual-search", label: "Visual Search" },
  { href: "/ai-shopping#recommendations", label: "Recommendations" },
] as const;

export const PAYMENT_METHODS = ["Visa", "Mastercard", "PayPal", "Apple Pay"] as const;

/** Custom event to open the Vapi assistant from anywhere in the storefront. */
export const VAPI_OPEN_ASSISTANT_EVENT = "storefront:open-vapi-assistant";

export function requestOpenVapiAssistant() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VAPI_OPEN_ASSISTANT_EVENT));
  }
}
