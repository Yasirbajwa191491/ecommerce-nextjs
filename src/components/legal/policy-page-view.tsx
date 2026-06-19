"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2, Package, RotateCcw, Shield } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegalPageContent } from "@/hooks/use-legal-page-content";
import type { PolicySettingKey } from "@/lib/legal-content";
import { CONTENT_PROSE_WIDTH, PAGE_GUTTER, SECTION_PADDING_Y } from "@/lib/layout-constants";
import {
  SHOP_BODY,
  SHOP_EYEBROW,
  SHOP_PAGE_LEAD,
  SHOP_PAGE_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

type PolicyVariant = "terms" | "privacy" | "shipping" | "return";

type PolicyPageConfig = {
  settingKey: PolicySettingKey;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof FileText;
};

const POLICY_PAGES: Record<PolicyVariant, PolicyPageConfig> = {
  terms: {
    settingKey: "terms_conditions",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    description:
      "Please read these terms carefully before placing an order. They outline how we process purchases, payments, and order fulfillment.",
    icon: FileText,
  },
  privacy: {
    settingKey: "privacy_policy",
    title: "Privacy Policy",
    eyebrow: "Your data",
    description:
      "We are committed to protecting your personal information. This policy explains what we collect, how we use it, and your rights.",
    icon: Shield,
  },
  shipping: {
    settingKey: "shipping_policy",
    title: "Shipping Policy",
    eyebrow: "Delivery",
    description:
      "Learn how we calculate shipping costs, when orders ship, and how to track your delivery from checkout to your door.",
    icon: Package,
  },
  return: {
    settingKey: "return_policy",
    title: "Return Policy",
    eyebrow: "Refunds",
    description:
      "Our return and refund guidelines help you shop with confidence. Review eligibility, timelines, and how to start a return.",
    icon: RotateCcw,
  },
};

function PolicyPageContent({ variant }: { variant: PolicyVariant }) {
  const config = POLICY_PAGES[variant];
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";
  const { html, isLoading } = useLegalPageContent(config.settingKey);
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-muted/20">
      <section className="border-b border-border/60 bg-background">
        <div
          className={cn("mx-auto w-full max-w-[1600px]", SECTION_PADDING_Y)}
          style={PAGE_GUTTER}
        >
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-none md:text-left">
            <span className={SHOP_EYEBROW}>
              <Icon className="size-3.5 sm:size-4" />
              {config.eyebrow}
            </span>
            <h1 className={cn("mt-4", SHOP_PAGE_TITLE)}>{config.title}</h1>
            <p className={cn("max-w-2xl", SHOP_PAGE_LEAD)}>{config.description}</p>
          </div>
        </div>
      </section>

      <section
        className={cn("mx-auto w-full max-w-[1600px]", SECTION_PADDING_Y)}
        style={PAGE_GUTTER}
      >
        <div className="w-full">
          <Card className="w-full overflow-hidden border-border/60 bg-card shadow-sm">
            <CardContent className="p-6 sm:p-8 md:p-10 lg:p-12">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[92%]" />
                  <Skeleton className="h-4 w-[88%]" />
                  <Skeleton className="mt-8 h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                </div>
              ) : (
                <div
                  className={cn(
                    "legal-content rich-text-content",
                    CONTENT_PROSE_WIDTH,
                    SHOP_BODY
                  )}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              )}
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <BackButton
              href={fromCheckout ? "/checkout" : "/"}
              label={fromCheckout ? "Back to checkout" : "Back to store"}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function PolicyPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-8 animate-spin text-[#6254f3]" />
    </div>
  );
}

export function PolicyPageView({ variant }: { variant: PolicyVariant }) {
  return (
    <Suspense fallback={<PolicyPageFallback />}>
      <PolicyPageContent variant={variant} />
    </Suspense>
  );
}
