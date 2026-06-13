import { HomePageView } from "@/components/home/home-page-view";
import { HomeJsonLd } from "@/components/home/home-json-ld";
import { createPageMetadata } from "@/lib/seo";
import { STORE_NAME } from "@/lib/site";

export const metadata = createPageMetadata({
  title: `${STORE_NAME} — Premium Products For Your Lifestyle`,
  description:
    "Shop curated furniture, electronics, and lifestyle essentials. Secure Stripe checkout, fast delivery, order tracking, and verified customer reviews.",
  path: "/home",
});

export default function HomePage() {
  return (
    <>
      <HomeJsonLd />
      <HomePageView />
    </>
  );
}
