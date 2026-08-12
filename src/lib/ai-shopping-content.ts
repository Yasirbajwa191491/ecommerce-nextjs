import type { LucideIcon } from "lucide-react";
import {
  Camera,
  MessageSquareText,
  Mic,
  Sparkles,
} from "lucide-react";

export { AI_SHOPPING_FAQ, AI_SHOPPING_JOURNEY } from "@/lib/ai-shopping-copy";

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
      "Upload a photo or use your camera to find visually similar products in our catalog.",
    example: "Snap a desk lamp — see matching items instantly.",
    anchor: "visual-search",
    action: { type: "link", href: "/products/visual-search", label: "Search by image" },
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

