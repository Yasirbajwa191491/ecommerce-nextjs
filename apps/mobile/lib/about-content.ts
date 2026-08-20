import type { Ionicons } from "@expo/vector-icons";

type IoniconName = keyof typeof Ionicons.glyphMap;

export type AboutFeature = {
  title: string;
  description: string;
  icon: IoniconName;
};

export type AboutFaqItem = {
  question: string;
  answer: string;
};

export type AboutStep = {
  step: number;
  title: string;
  description: string;
  icon: IoniconName;
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
    icon: "search-outline",
  },
  {
    step: 2,
    title: "Choose Product Options",
    description:
      "Select available options such as colors, sizes, and quantities before adding to your cart.",
    icon: "color-palette-outline",
  },
  {
    step: 3,
    title: "Add To Cart",
    description:
      "Add products to your cart and review your selections before proceeding to checkout.",
    icon: "cart-outline",
  },
  {
    step: 4,
    title: "Secure Checkout",
    description:
      "Provide delivery details and choose a payment method in our secure checkout flow.",
    icon: "shield-checkmark-outline",
  },
  {
    step: 5,
    title: "Order Confirmation",
    description:
      "Your order is securely created and payment is processed according to your chosen method.",
    icon: "cube-outline",
  },
  {
    step: 6,
    title: "Track Your Order",
    description:
      "Track order progress and view status updates from confirmation through delivery.",
    icon: "locate-outline",
  },
];

export const WHY_SHOP_FEATURES: AboutFeature[] = [
  {
    title: "Secure Payments",
    description: "Stripe-powered secure checkout for card payments.",
    icon: "shield-checkmark-outline",
  },
  {
    title: "Fast Ordering Process",
    description: "Simple and user-friendly shopping experience from browse to buy.",
    icon: "flash-outline",
  },
  {
    title: "Order Tracking",
    description: "Track your orders anytime with real-time status updates.",
    icon: "locate-outline",
  },
  {
    title: "Quality Products",
    description: "Carefully managed product catalog with accurate listings.",
    icon: "sparkles-outline",
  },
  {
    title: "Customer Support",
    description: "Responsive support team ready to help with your questions.",
    icon: "headset-outline",
  },
  {
    title: "Transparent Pricing",
    description: "Clear product pricing, discounts, and shipping costs upfront.",
    icon: "pricetag-outline",
  },
  {
    title: "AI-Powered Experience",
    description:
      "From semantic search to smart support automation, AI helps you find products and get answers faster.",
    icon: "sparkles-outline",
  },
];

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

export const ABOUT_CTA = {
  title: "Ready to shop smarter?",
  description:
    "Explore our full catalog or get in touch — we are here to help you find the right products.",
} as const;
