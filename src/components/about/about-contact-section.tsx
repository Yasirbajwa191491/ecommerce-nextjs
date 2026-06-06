"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { AboutSectionHeader } from "@/components/about/about-section-header";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { ABOUT_CARD_GRID_CLASS, PAGE_GUTTER } from "@/lib/layout-constants";

type ContactCard = {
  icon: typeof MapPin;
  title: string;
  lines: string[];
  href?: string;
};

export function AboutContactSection() {
  const { address, phone, phoneHref, email, businessHours } = useSiteSettings();

  const contactCards: ContactCard[] = [
    {
      icon: Mail,
      title: "Company Email",
      lines: [email],
      href: `mailto:${email}`,
    },
    {
      icon: Phone,
      title: "Phone Number",
      lines: [phone],
      href: phoneHref,
    },
    {
      icon: MapPin,
      title: "Business Address",
      lines: [address],
    },
    {
      icon: Clock,
      title: "Business Hours",
      lines: [businessHours],
    },
  ];

  return (
    <section className="bg-background py-6 sm:py-10 md:py-12 lg:py-14">
      <div className="mx-auto w-full max-w-[1600px]" style={PAGE_GUTTER}>
        <AboutSectionHeader
          badge="Contact"
          badgeIcon={Mail}
          title="Contact Information"
          description="Reach us through any of the channels below. Details are managed from store settings."
        />

        <div className={ABOUT_CARD_GRID_CLASS}>
          {contactCards.map(({ icon: Icon, title, lines, href }) => (
            <Card
              key={title}
              className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <CardContent className="flex flex-col p-3 sm:p-4">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#6254f3]/10 text-[#6254f3] sm:size-9 sm:rounded-xl">
                  <Icon className="size-4 sm:size-5" />
                </span>
                <p className="mt-2 text-xs font-semibold text-foreground sm:mt-3 sm:text-sm">
                  {title}
                </p>
                {lines.map((line) =>
                  href ? (
                    <a
                      key={line}
                      href={href}
                      className="mt-1 wrap-break-word text-[11px] text-muted-foreground transition-colors hover:text-[#6254f3] sm:text-xs md:text-sm"
                    >
                      {line}
                    </a>
                  ) : (
                    <p
                      key={line}
                      className="mt-1 wrap-break-word text-[11px] leading-snug text-muted-foreground sm:text-xs md:text-sm md:leading-relaxed"
                    >
                      {line}
                    </p>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Prefer a form?{" "}
          <Link
            href="/contact"
            className="font-medium text-[#6254f3] underline-offset-4 hover:underline"
          >
            Visit our contact page
          </Link>
        </p>
      </div>
    </section>
  );
}
