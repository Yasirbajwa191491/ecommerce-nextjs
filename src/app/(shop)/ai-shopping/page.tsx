import type { Metadata } from "next";
import { AiShoppingPageView } from "@/components/ai-shopping/ai-shopping-page-view";

export const metadata: Metadata = {
  title: "AI Shopping",
  description:
    "Shop smarter with AI-powered search, voice shopping, visual discovery, and personalized recommendations.",
};

export default function AiShoppingPage() {
  return <AiShoppingPageView />;
}
