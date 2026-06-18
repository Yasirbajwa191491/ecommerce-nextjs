"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Loader2, Shield } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegalPageContent } from "@/hooks/use-legal-page-content";
import type { RichTextSettingKey } from "@/lib/legal-content";
import { cn } from "@/lib/utils";

type PolicyPageConfig = {
  settingKey: RichTextSettingKey;
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof FileText;
};

const POLICY_PAGES: Record<"terms" | "privacy", PolicyPageConfig> = {
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
};

function PolicyPageContent({ variant }: { variant: "terms" | "privacy" }) {
  const config = POLICY_PAGES[variant];
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get("from") === "checkout";
  const { html, isLoading } = useLegalPageContent(config.settingKey);
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-muted/20">
      <section className="border-b border-border/60 bg-background">
        <div
          className="mx-auto w-full max-w-[1600px] py-8 sm:py-10 md:py-12"
          style={{
            paddingLeft: "clamp(1rem, 3vw, 3rem)",
            paddingRight: "clamp(1rem, 3vw, 3rem)",
          }}
        >
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-none md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#6254f3] uppercase sm:text-xs">
              <Icon className="size-3.5" />
              {config.eyebrow}
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
              {config.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {config.description}
            </p>
          </div>
        </div>
      </section>

      <section
        className="mx-auto w-full max-w-[1600px] py-8 sm:py-10 md:py-12 lg:py-14"
        style={{
          paddingLeft: "clamp(1rem, 3vw, 3rem)",
          paddingRight: "clamp(1rem, 3vw, 3rem)",
        }}
      >
        <div className="mx-auto w-full max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
            <CardContent className="p-6 sm:p-8 md:p-10">
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
                    "legal-content rich-text-content text-sm leading-relaxed sm:text-[0.95rem]"
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

export function PolicyPageView({ variant }: { variant: "terms" | "privacy" }) {
  return (
    <Suspense fallback={<PolicyPageFallback />}>
      <PolicyPageContent variant={variant} />
    </Suspense>
  );
}
