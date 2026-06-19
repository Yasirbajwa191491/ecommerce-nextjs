"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { STORE_NAME } from "@/lib/site";
import {
  SHOP_BODY,
  SHOP_CARD_TITLE,
  SHOP_EYEBROW,
  SHOP_PAGE_LEAD,
  SHOP_PAGE_TITLE,
} from "@/lib/typography";
import {
  PAGE_GUTTER,
  SECTION_PADDING_Y,
} from "@/lib/layout-constants";
import { cn } from "@/lib/utils";

type ContactCard = {
  icon: typeof MapPin;
  title: string;
  lines: string[];
  href?: string;
};

export default function ContactPage() {
  const { address, phone, phoneHref, email, businessHours } = useSiteSettings();

  const contactCards: ContactCard[] = [
    {
      icon: MapPin,
      title: "Visit us",
      lines: [address],
    },
    {
      icon: Phone,
      title: "Call us",
      lines: [phone],
      href: phoneHref,
    },
    {
      icon: Mail,
      title: "Email us",
      lines: [email],
      href: `mailto:${email}`,
    },
    {
      icon: Clock,
      title: "Business hours",
      lines: [businessHours],
    },
  ];

  return (
    <div className="min-h-screen bg-muted/20">
      <section className="border-b border-border/60 bg-background">
        <div
          className={cn("mx-auto w-full max-w-[1600px]", SECTION_PADDING_Y)}
          style={PAGE_GUTTER}
        >
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-none md:text-left">
            <span className={SHOP_EYEBROW}>
              <MessageSquare className="size-3.5 sm:size-4" />
              Contact
            </span>
            <h1 className={cn("mt-4", SHOP_PAGE_TITLE)}>We&apos;re here to help</h1>
            <p className={cn("max-w-2xl", SHOP_PAGE_LEAD)}>
              Questions about an order, product, or partnership? Reach out to
              the {STORE_NAME} team — we typically respond within 1–2 business
              days.
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn("mx-auto w-full max-w-[1600px]", SECTION_PADDING_Y)}
        style={PAGE_GUTTER}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-8 xl:gap-10">
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {contactCards.map(({ icon: Icon, title, lines, href }) => (
                <Card
                  key={title}
                  className="border-border/60 bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex gap-4 p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#6254f3]/10 text-[#6254f3]">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className={SHOP_CARD_TITLE}>{title}</p>
                      {lines.map((line) =>
                        href ? (
                          <a
                            key={line}
                            href={href}
                            className={cn("mt-1 block transition-colors hover:text-[#6254f3]", SHOP_BODY)}
                          >
                            {line}
                          </a>
                        ) : (
                          <p key={line} className={cn("mt-1", SHOP_BODY)}>
                            {line}
                          </p>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-border/60 bg-gradient-to-br from-[#6254f3]/8 to-transparent shadow-sm">
              <CardContent className="space-y-3 p-5 sm:p-6">
                <p className={SHOP_CARD_TITLE}>Prefer browsing on your own?</p>
                <p className={SHOP_BODY}>
                  Explore our full catalog of furniture, electronics, and
                  lifestyle essentials anytime.
                </p>
                <Button
                  render={<Link href="/products" />}
                  variant="outline"
                  className="h-10 border-[#6254f3]/30 text-[#6254f3] hover:bg-[#6254f3]/5"
                >
                  View all products
                </Button>
              </CardContent>
            </Card>
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}
