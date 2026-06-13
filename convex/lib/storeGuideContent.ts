import { getSiteUrl } from "./siteUrl";

function page(path: string): string {
  const base = getSiteUrl().replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const STORE_PAGE_URLS = {
  home: page("/home"),
  products: page("/products"),
  about: page("/about"),
  contact: page("/contact"),
  trackOrder: page("/track-order"),
} as const;

export const HOW_TO_BUY_STEPS = [
  "Browse products using categories, search, or filters on the Products page.",
  "Open a product page and choose available colors and quantity.",
  "Click Add to Cart, then review your cart.",
  "Go to Checkout, enter delivery details, and choose a payment method.",
  "Confirm your order — you will receive an order number for tracking.",
] as const;

export const PAYMENT_METHODS = [
  {
    id: "stripe",
    name: "Credit & Debit Cards",
    description:
      "Pay securely online with major credit and debit cards through Stripe Checkout. All card transactions are encrypted.",
    brands: ["Visa", "Mastercard", "PayPal", "Apple Pay"],
  },
  {
    id: "cod",
    name: "Cash on Delivery",
    description:
      "Choose Cash on Delivery at checkout and pay when your order arrives at your doorstep.",
  },
] as const;

export const TRACKING_GUIDE = {
  pageUrl: STORE_PAGE_URLS.trackOrder,
  methods: ["Order number", "Email address", "Phone number"],
  steps: [
    "Go to the Track Order page or ask me to track with your order number.",
    "Enter the order number or email used at checkout.",
    "View real-time status from confirmed through processing, shipped, and delivered.",
  ],
} as const;

export const SUPPORT_CHANNELS = [
  {
    channel: "Email",
    description: "Email us for order updates, product questions, and general support.",
  },
  {
    channel: "Phone",
    description: "Call during business hours for urgent order assistance.",
  },
  {
    channel: "Contact form",
    description: "Submit a message on the Contact page and our team will respond promptly.",
  },
  {
    channel: "AI assistant",
    description: "Use this chat or voice assistant for products, orders, and store policies.",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "How do I place an order?",
    answer:
      "Browse the catalog, select colors and quantity, add to cart, checkout with delivery details, choose payment, and confirm.",
  },
  {
    question: "Can I pay with Cash on Delivery?",
    answer: "Yes. Select Cash on Delivery at checkout and pay when your order is delivered.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Visit the Track Order page with your order number, email, or phone from checkout, or ask me to track it for you.",
  },
  {
    question: "Are online payments secure?",
    answer:
      "Yes. Card payments are processed securely through Stripe. We never store your full card details.",
  },
  {
    question: "How are shipping charges calculated?",
    answer:
      "Free shipping applies to eligible products. Other items show shipping on the product page and in checkout before payment.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Email us, call during business hours, use the Contact page, or continue chatting here.",
  },
] as const;

export const ABOUT_SUMMARY = {
  title: "About our store",
  story:
    "We offer curated furniture, electronics, and lifestyle essentials with accurate descriptions, transparent pricing, and reliable fulfillment.",
  highlights: [
    "Curated catalog with real-time stock availability",
    "Secure checkout with card and cash-on-delivery options",
    "Dedicated support for orders, payments, and delivery",
  ],
  whyShop: [
    "Secure Stripe-powered payments",
    "Simple browse-to-buy experience",
    "Real-time order tracking",
    "Quality products with verified reviews",
    "Responsive customer support",
    "Transparent pricing and shipping",
  ],
} as const;
