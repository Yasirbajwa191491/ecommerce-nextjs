export const STORE_NAME = "Ecommerce Store";

/** Canonical storefront homepage path. */
export const HOME_PATH = "/home" as const;

export const CONTACT_INFO = {
  address: "DHA Phase 6 Lahore, Pakistan, 54000",
  phone: "+1 (800) 555-0199",
  phoneHref: "tel:+18005550199",
  email: "yasir.sohail@savari.io",
  hours: "Mon – Fri, 9:00 AM – 6:00 PM (PKT)",
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
