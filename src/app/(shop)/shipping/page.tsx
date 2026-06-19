import type { Metadata } from "next";
import { PolicyPageView } from "@/components/legal/policy-page-view";
import { STORE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Shipping Policy | ${STORE_NAME}`,
  description:
    "Shipping and delivery information for our store — costs, timelines, and order tracking.",
};

export default function ShippingPolicyPage() {
  return <PolicyPageView variant="shipping" />;
}
