export const STORE_NAME = "Ecommerce Store";

export const CONTACT_INFO = {
  address: "DHA Phase 6 Lahore, Pakistan, 54000",
  phone: "+1 (800) 555-0199",
  phoneHref: "tel:+18005550199",
  email: "yasir.sohail@savari.io",
  hours: "Mon – Fri, 9:00 AM – 6:00 PM (PKT)",
} as const;

export const NAV_LINKS = [
  { href: "/home", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/track-order", label: "Track Order" },
] as const;
