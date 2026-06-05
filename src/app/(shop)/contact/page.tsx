"use client";

import Link from "next/link";
import { Clock, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { STORE_NAME } from "@/lib/site";

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
          className="mx-auto w-full max-w-[1600px] py-8 sm:py-10 md:py-12"
          style={{
            paddingLeft: "clamp(1rem, 3vw, 3rem)",
            paddingRight: "clamp(1rem, 3vw, 3rem)",
          }}
        >
          <div className="mx-auto max-w-3xl text-center md:mx-0 md:max-w-none md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#6254f3]/20 bg-[#6254f3]/5 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[#6254f3] uppercase sm:text-xs">
              <MessageSquare className="size-3.5" />
              Contact
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.5rem]">
              We&apos;re here to help
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Questions about an order, product, or partnership? Reach out to
              the {STORE_NAME} team — we typically respond within 1–2 business
              days.
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
                      <p className="text-sm font-semibold text-foreground">
                        {title}
                      </p>
                      {lines.map((line) =>
                        href ? (
                          <a
                            key={line}
                            href={href}
                            className="mt-1 block text-sm text-muted-foreground transition-colors hover:text-[#6254f3]"
                          >
                            {line}
                          </a>
                        ) : (
                          <p
                            key={line}
                            className="mt-1 text-sm leading-relaxed text-muted-foreground"
                          >
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
                <p className="text-sm font-semibold text-foreground">
                  Prefer browsing on your own?
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
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
