import type { LucideIcon } from "lucide-react";
import {
  Camera,
  MessageSquareText,
  Mic,
  Sparkles,
} from "lucide-react";

export type AiCapabilityAction =
  | { type: "link"; href: string; label: string }
  | { type: "assistant"; label: string };

export type AiCapability = {
  id: string;
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  example: string;
  anchor?: string;
  /** Primary capability — subtle visual emphasis in the grid */
  featured?: boolean;
  action?: AiCapabilityAction;
};

export const AI_SHOPPING_CAPABILITIES: AiCapability[] = [
  {
    id: "search",
    icon: MessageSquareText,
    badge: "AI",
    title: "AI Search",
    featured: true,
    description:
      "Describe what you need naturally. AI understands intent, budget, and context to surface the best catalog matches.",
    example: '"Comfortable office chair under $200"',
    action: { type: "link", href: "/products", label: "Search products" },
  },
  {
    id: "voice",
    icon: Mic,
    badge: "Voice",
    title: "AI Voice Shopping",
    description:
      "Talk to the assistant to discover products, compare options, and manage your cart hands-free.",
    example: '"Add the blue headphones to my cart."',
    action: { type: "assistant", label: "Open assistant" },
  },
  {
    id: "visual",
    icon: Camera,
    badge: "Vision",
    title: "Visual Product Search",
    description:
      "Describe or reference products visually and discover similar items from our catalog.",
    example: '"Find products like this minimalist desk lamp."',
    anchor: "visual-search",
    action: { type: "assistant", label: "Try with assistant" },
  },
  {
    id: "recommendations",
    icon: Sparkles,
    badge: "Personalized",
    title: "Personalized Recommendations",
    description:
      "Suggestions based on products you view and items in your cart during this browser session — no sign-in required.",
    example: "Picks refresh as you browse and add to cart.",
    anchor: "recommendations",
    action: { type: "link", href: "/home", label: "See on homepage" },
  },
];

export const AI_SHOPPING_JOURNEY = [
  "AI-powered discovery",
  "Product exploration",
  "Smart recommendations",
  "Confident purchase",
] as const;

export const AI_SHOPPING_FAQ = [
  {
    question: "Do I need an account to use AI shopping?",
    answer:
      "No account is required to search, use the assistant, or checkout as a guest. AI search and voice shopping work immediately. Session-based recommendations use products you view and cart items stored in your browser during this visit.",
  },
  {
    question: "How do personalized recommendations work without an account?",
    answer:
      "During your visit, we use locally stored browsing history and cart activity to suggest related products. These signals stay on your device unless you place an order, when checkout details can help associate future visits with your purchase history.",
  },
  {
    question: "Can the assistant help with my order?",
    answer:
      "Yes. Ask about order status, delivery, or returns. You can also use Track Order and ask the AI assistant for help.",
  },
  {
    question: "Is voice shopping available on mobile?",
    answer:
      "Yes. Tap the AI assistant button and use voice or text — both work on mobile and desktop.",
  },
] as const;
