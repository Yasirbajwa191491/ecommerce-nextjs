import { HomePageView } from "@/components/home/home-page-view";
import { HomeJsonLd } from "@/components/home/home-json-ld";
import { createPageMetadata } from "@/lib/seo";
import { STORE_NAME } from "@/lib/site";

export const metadata = createPageMetadata({
  title: `${STORE_NAME} — Your Trusted Online Pharmacy`,
  description:
    "Order medicines, vitamins, supplements, and healthcare products online. Secure Stripe checkout, fast delivery, order tracking, and verified customer reviews.",
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
