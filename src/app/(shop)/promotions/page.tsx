import type { Metadata } from "next";
import { PromotionsPageView } from "@/components/promotions/promotions-page-view";

export const metadata: Metadata = {
  title: "Promotions",
  description: "Active promotions, bundle deals, and limited-time offers.",
};

export default function PromotionsPage() {
  return <PromotionsPageView />;
}
