import type { Metadata } from "next";
import { PolicyPageView } from "@/components/legal/policy-page-view";
import { STORE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: `Return Policy | ${STORE_NAME}`,
  description:
    "Return and refund policy — eligibility, timelines, and how to request a return.",
};

export default function ReturnPolicyPage() {
  return <PolicyPageView variant="return" />;
}
