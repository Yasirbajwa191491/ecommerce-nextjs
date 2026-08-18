"use client";

import Link from "next/link";
import { Lock, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { FooterNewsletter } from "@/components/layout/footer-newsletter";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { StoreLogoLink } from "@/components/layout/store-logo-link";
import {
  FOOTER_AI_LINKS,
  FOOTER_COMPANY_LINKS,
  FOOTER_SHOP_LINKS,
  FOOTER_SUPPORT_LINKS,
  PAYMENT_METHODS,
} from "@/lib/site";
import { FOOTER_COLUMN_TITLE, FOOTER_LINK } from "@/lib/typography";
import { cn } from "@/lib/utils";

const FOOTER_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

function FooterLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(FOOTER_LINK, className)}>
      {children}
    </Link>
  );
}

function FooterColumn({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h3 className={FOOTER_COLUMN_TITLE}>{title}</h3>
      <div className="mt-3 sm:mt-4">{children}</div>
    </div>
  );
}

function FooterLinkList({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <ul className="space-y-2.5 sm:space-y-3">
      {links.map(({ href, label }) => (
        <li key={`${href}-${label}`}>
          <FooterLink href={href}>{label}</FooterLink>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  const { storeName, address, phone, phoneHref, email } = useSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-brand-navy text-white">
      <div
        className="mx-auto w-full max-w-[1600px] py-12 sm:py-14 lg:py-16"
        style={FOOTER_GUTTER}
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:gap-12 lg:grid-cols-12 lg:gap-8 xl:gap-10">
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <StoreLogoLink className="text-lg text-white hover:opacity-90 sm:text-xl" />
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/65 sm:mt-5">
              Quality products across every category. Shop smarter with
              AI-powered search, recommendations, and personalized assistance.
            </p>

            <div className="mt-6 space-y-3 text-base text-white/70 sm:mt-7">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
                <span className="min-w-0 break-words">{address}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
                <a
                  href={phoneHref}
                  className="min-w-0 break-words transition-colors hover:text-brand-accent"
                >
                  {phone}
                </a>
              </p>
              <p className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-accent" aria-hidden />
                <a
                  href={`mailto:${email}`}
                  className="min-w-0 break-all transition-colors hover:text-brand-accent sm:break-words"
                >
                  {email}
                </a>
              </p>
            </div>
          </div>

          <FooterColumn title="Shop" className="lg:col-span-2">
            <FooterLinkList links={FOOTER_SHOP_LINKS} />
          </FooterColumn>

          <FooterColumn title="Customer Support" className="lg:col-span-2">
            <FooterLinkList links={FOOTER_SUPPORT_LINKS} />
          </FooterColumn>

          <FooterColumn title="Company" className="lg:col-span-2">
            <FooterLinkList links={FOOTER_COMPANY_LINKS} />
          </FooterColumn>

          <FooterColumn title="AI Shopping" className="lg:col-span-3">
            <FooterLinkList links={FOOTER_AI_LINKS} />
            <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/60">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-brand-accent" aria-hidden />
                Secure checkout
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock className="size-4 text-brand-accent" aria-hidden />
                Encrypted payments
              </span>
            </div>
          </FooterColumn>
        </div>

        <div className="mt-10 border-t border-white/10 pt-8 sm:mt-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-white/50 uppercase">
                Stay in the loop
              </p>
              <p className="mt-2 max-w-md text-base leading-relaxed text-white/65">
                Subscribe for new arrivals, exclusive offers, and curated picks.
              </p>
              <FooterNewsletter />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-[0.14em] text-white/50 uppercase">
                We accept
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-medium text-white/75"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div
          className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 py-5 text-center text-sm text-white/55 sm:flex-row sm:justify-between sm:py-6 sm:text-left sm:text-base"
          style={FOOTER_GUTTER}
        >
          <p>© {year} {storeName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end">
            {FOOTER_COMPANY_LINKS.map(({ href, label }) => (
              <FooterLink key={label} href={href}>
                {label}
              </FooterLink>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
