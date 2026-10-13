import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "@convex/_generated/api";
import { PromotionsPageView } from "@/components/promotions/promotions-page-view";
import { PromotionsSeoSnapshot } from "@/components/promotions/promotions-seo-snapshot";
import { readServerNow } from "@/lib/server-now";
import { STORE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Promotions",
  description: `Active promotions, bundle deals, and limited-time offers at ${STORE_NAME}.`,
};

export default async function PromotionsPage() {
  let initialPromotions;
  try {
    initialPromotions = await fetchQuery(
      api.productPromotions.listActiveForStorefront,
      { now: readServerNow() }
    );
  } catch {
    initialPromotions = undefined;
  }

  return (
    <>
      {initialPromotions ? (
        <PromotionsSeoSnapshot promotions={initialPromotions} />
      ) : null}
      <PromotionsPageView initialPromotions={initialPromotions} />
    </>
  );
}
