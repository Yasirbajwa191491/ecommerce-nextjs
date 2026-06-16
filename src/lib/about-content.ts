import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  CreditCard,
  Headphones,
  Mail,
  MessageSquare,
  Package,
  PackageSearch,
  Palette,
  Phone,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";

export type AboutStep = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type AboutFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type AboutFaqItem = {
  question: string;
  answer: string;
};

export type AboutInfoCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export const ABOUT_HERO = {
  badge: "About",
  title: "Making Online Shopping Simple and Reliable",
  description:
    "Browse curated products, use AI-powered discovery and support, place orders securely, track deliveries in real time, and stay connected across voice and SMS in one seamless shopping experience.",
  image: {
    src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
    alt: "Customer shopping online with a laptop and credit card",
  },
} as const;

export const ABOUT_STORY = {
  title: "Our Story",
  subtitle: "Built for modern shoppers who value quality, clarity, and trust.",
  image: {
    src: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&w=900&q=80",
    alt: "Curated furniture and lifestyle products in a modern showroom",
  },
  paragraphs: [
    "We started with a simple idea: online shopping should feel effortless from the first click to delivery at your door. Our store brings together furniture, electronics, and lifestyle essentials in one place — curated for quality and everyday value.",
    "Every product in our catalog is managed with care. We focus on accurate descriptions, transparent pricing, and reliable fulfillment so you always know what to expect.",
    "As we have grown, we have added practical AI capabilities across discovery, communication, and catalog operations to make shopping faster and smarter for both customers and store teams.",
    "Customer satisfaction is at the heart of everything we do. Whether you are placing your first order or your tenth, our team is committed to making your experience smooth, secure, intelligent, and enjoyable.",
  ],
  highlights: [
    "Curated product catalog with real-time availability",
    "AI-powered semantic search and voice shopping assistance",
    "Smart review insights and AI-assisted product content generation",
    "Integrated SMS and outbound call workflows for faster communication",
    "Secure checkout with multiple payment options",
    "Dedicated support for orders, payments, and delivery",
  ],
} as const;

export const HOW_IT_WORKS_STEPS: AboutStep[] = [
  {
    step: 1,
    title: "Browse Products",
    description:
      "Explore products using categories, search, and filters to find exactly what you need.",
    icon: Search,
  },
  {
    step: 2,
    title: "Choose Product Options",
    description:
      "Select available options such as colors, sizes, and quantities before adding to your cart.",
    icon: Palette,
  },
  {
    step: 3,
    title: "Add To Cart",
    description:
      "Add products to your cart and review your selections before proceeding to checkout.",
    icon: ShoppingCart,
  },
  {
    step: 4,
    title: "Secure Checkout",
    description:
      "Provide delivery details and choose a payment method in our secure checkout flow.",
    icon: ShieldCheck,
  },
  {
    step: 5,
    title: "Order Confirmation",
    description:
      "Your order is securely created and payment is processed according to your chosen method.",
    icon: Package,
  },
  {
    step: 6,
    title: "Track Your Order",
    description:
      "Track order progress and view status updates from confirmation through delivery.",
    icon: PackageSearch,
  },
];

export const WHY_SHOP_FEATURES: AboutFeature[] = [
  {
    title: "Secure Payments",
    description: "Stripe-powered secure checkout for card payments.",
    icon: ShieldCheck,
  },
  {
    title: "Fast Ordering Process",
    description: "Simple and user-friendly shopping experience from browse to buy.",
    icon: Zap,
  },
  {
    title: "Order Tracking",
    description: "Track your orders anytime with real-time status updates.",
    icon: PackageSearch,
  },
  {
    title: "Quality Products",
    description: "Carefully managed product catalog with accurate listings.",
    icon: Sparkles,
  },
  {
    title: "Customer Support",
    description: "Responsive support team ready to help with your questions.",
    icon: Headphones,
  },
  {
    title: "Transparent Pricing",
    description: "Clear product pricing, discounts, and shipping costs upfront.",
    icon: Tag,
  },
  {
    title: "AI-Powered Experience",
    description:
      "From semantic search to smart support automation, AI helps you find products and get answers faster.",
    icon: Sparkles,
  },
];

export const ABOUT_AI_FEATURES: AboutFeature[] = [
  {
    title: "Semantic Product Search",
    description:
      "Natural-language semantic search understands shopper intent and returns more relevant product results.",
    icon: Search,
  },
  {
    title: "AI Voice Assistant",
    description:
      "Voice-first assistance helps customers discover products, navigate choices, and get instant shopping guidance.",
    icon: MessageSquare,
  },
  {
    title: "AI Outbound Calls",
    description:
      "Automated outbound calls support important updates, reminders, and customer communication workflows.",
    icon: Phone,
  },
  {
    title: "Review Intelligence",
    description:
      "AI review analysis highlights trends, sentiment, and product quality signals for better buying decisions.",
    icon: Sparkles,
  },
  {
    title: "SMS Configuration",
    description:
      "Configurable SMS channels keep customers informed with timely notifications and transactional updates.",
    icon: MessageSquare,
  },
  {
    title: "AI Content Generation",
    description:
      "While adding products, AI helps generate cleaner descriptions and content that improves catalog quality.",
    icon: Tag,
  },
];

export const PAYMENT_METHODS: AboutInfoCard[] = [
  {
    title: "Credit Cards",
    description: "Pay securely with major credit cards through Stripe Checkout.",
    icon: CreditCard,
  },
  {
    title: "Debit Cards",
    description: "Use your debit card for fast, secure online payments.",
    icon: Wallet,
  },
  {
    title: "Stripe Payments",
    description: "All card transactions are encrypted and processed by Stripe.",
    icon: ShieldCheck,
  },
  {
    title: "Cash On Delivery",
    description: "Pay when your order arrives at your doorstep.",
    icon: Banknote,
  },
];

export const PAYMENT_BRANDS = [
  "Visa",
  "Mastercard",
  "PayPal",
  "Apple Pay",
] as const;

export const SHIPPING_CARDS: AboutInfoCard[] = [
  {
    title: "Free Shipping Products",
    description:
      "Select products include free shipping — look for the free shipping badge on product pages.",
    icon: Truck,
  },
  {
    title: "Shipping Charges",
    description:
      "Products with shipping fees display the cost clearly on the product detail page.",
    icon: Tag,
  },
  {
    title: "Costs Before Checkout",
    description:
      "Shipping costs are calculated and shown in your cart and checkout summary before you pay.",
    icon: ShoppingCart,
  },
  {
    title: "Transparent Delivery",
    description:
      "Once your order ships, you receive status updates through our order tracking system.",
    icon: Package,
  },
  {
    title: "Order Status Updates",
    description:
      "Follow your order from placed to confirmed, processing, shipped, and delivered.",
    icon: PackageSearch,
  },
];

export const TRACKING_STEPS = [
  {
    step: 1,
    title: "Enter your details",
    description: "Use your order number, email, or phone from checkout.",
  },
  {
    step: 2,
    title: "View order progress",
    description: "See real-time status from confirmation through delivery.",
  },
  {
    step: 3,
    title: "Stay updated",
    description: "Track each milestone until your order arrives.",
  },
] as const;

export const TRACKING_METHODS = [
  "Order Number",
  "Email Address",
  "Phone Number",
] as const;

export const SUPPORT_CHANNELS: AboutInfoCard[] = [
  {
    title: "AI Voice Assistant Support",
    description:
      "Our AI voice assistant can collect user details and submit support requests for faster escalation.",
    icon: Sparkles,
  },
  {
    title: "Email Support",
    description: "Reach us by email for order updates, product questions, and more.",
    icon: Mail,
  },
  {
    title: "Phone Support",
    description: "Call our team during business hours for urgent order assistance.",
    icon: Phone,
  },
  {
    title: "Contact Form",
    description: "Submit a message through our contact page and we will respond promptly.",
    icon: MessageSquare,
  },
];

export const SUPPORT_TOPICS = [
  "Orders and order status",
  "Payments and billing",
  "Product questions",
  "Delivery and shipping updates",
  "AI voice-assisted support request creation",
] as const;

export const FAQ_ITEMS: AboutFaqItem[] = [
  {
    question: "What AI-powered features are available in the store?",
    answer:
      "Our platform includes semantic product search, an AI voice assistant, AI-enabled outbound calling workflows, review analysis, SMS communication configuration, and AI-assisted content generation while adding products.",
  },
  {
    question: "How do I place an order?",
    answer:
      "Browse our catalog, select product options, add items to your cart, and proceed to checkout. Enter your delivery details, choose a payment method, and confirm your order.",
  },
  {
    question: "Can I pay with Cash on Delivery?",
    answer:
      "Yes. Cash on Delivery is available at checkout. Pay when your order is delivered to your address.",
  },
  {
    question: "How do I track my order?",
    answer:
      "Visit the Track Order page and enter your order number, email address, or phone number used at checkout to view real-time status updates.",
  },
  {
    question: "Are online payments secure?",
    answer:
      "Yes. Card payments are processed securely through Stripe with industry-standard encryption. We never store your full card details.",
  },
  {
    question: "Can I view my previous orders?",
    answer:
      "If you have an account, sign in to view your order history. You can also track any order using your order number and contact details.",
  },
  {
    question: "How are shipping charges calculated?",
    answer:
      "Shipping is free on eligible products. For others, shipping charges are shown on the product page and included in your cart and checkout totals before payment.",
  },
  {
    question: "How do discounts work?",
    answer:
      "Discounted products show the original and sale price on product pages. Discounts are applied automatically in your cart and checkout summary.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Email us, call during business hours, or use the contact form on our Contact page. Our team can help with orders, payments, products, and delivery.",
  },
];

export const ABOUT_BRANDS = {
  title: "Popular Brands",
  description:
    "Shop trusted names from our live catalog — every brand is sourced from products in our store.",
} as const;

export const STATS_LABELS = [
  { key: "productsAvailable" as const, label: "Products Available" },
  { key: "ordersProcessed" as const, label: "Orders Processed" },
  { key: "happyCustomers" as const, label: "Happy Customers" },
  { key: "productCategories" as const, label: "Product Categories" },
];

export const ABOUT_CTA = {
  title: "Ready to Start Shopping?",
  description:
    "Explore our full catalog or get in touch — we are here to help you find the right products.",
} as const;
