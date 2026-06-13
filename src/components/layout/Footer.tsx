"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import { FooterNewsletter } from "@/components/layout/footer-newsletter";
import { useSiteSettings } from "@/hooks/use-site-settings";
import { StoreLogoLink } from "@/components/layout/store-logo-link";
import { NAV_LINKS, STORE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const FOOTER_GUTTER = {
  paddingLeft: "clamp(1rem, 3vw, 3rem)",
  paddingRight: "clamp(1rem, 3vw, 3rem)",
} as const;

const SUPPORT_LINKS = [
  { href: "/contact", label: "Contact us" },
  { href: "/contact", label: "Shipping & delivery" },
  { href: "/contact", label: "Returns & refunds" },
] as const;

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
] as const;

const SOCIAL_LINKS = [
  { href: "#", label: "Facebook", icon: FaFacebookF },
  { href: "#", label: "Instagram", icon: FaInstagram },
  { href: "#", label: "X (Twitter)", icon: FaXTwitter },
  { href: "#", label: "YouTube", icon: FaYoutube },
] as const;

const PAYMENT_METHODS = ["Visa", "Mastercard", "PayPal", "Apple Pay"] as const;

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
    <Link
      href={href}
      className={cn(
        "text-sm text-white/70 transition-colors hover:text-[#a89cff]",
        className
      )}
    >
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
      <h3 className="text-xs font-semibold tracking-[0.14em] text-white uppercase sm:text-sm">
        {title}
      </h3>
      <div className="mt-3 sm:mt-4">{children}</div>
    </div>
  );
}

export default function Footer() {
  const { address, phone, phoneHref, email } = useSiteSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a1435] text-white">
      <div
        className="mx-auto w-full max-w-[1600px] py-12 sm:py-14 lg:py-16"
        style={FOOTER_GUTTER}
      >
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-10 md:gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-12">
          <div className="min-w-0 sm:col-span-2 lg:col-span-4">
            <StoreLogoLink className="text-lg text-white hover:opacity-90 sm:text-xl" />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65 sm:mt-5">
              Quality products across every category — electronics, furniture,
              kitchen, office, and more. Shop with confidence and fast delivery.
            </p>

            <div className="mt-6 space-y-3 text-sm text-white/70 sm:mt-7 sm:space-y-3.5">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#a89cff]" />
                <span className="min-w-0 break-words">{address}</span>
              </p>
              <p className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-[#a89cff]" />
                <a
                  href={phoneHref}
                  className="min-w-0 break-words transition-colors hover:text-[#a89cff]"
                >
                  {phone}
                </a>
              </p>
              <p className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-[#a89cff]" />
                <a
                  href={`mailto:${email}`}
                  className="min-w-0 break-all transition-colors hover:text-[#a89cff] sm:break-words"
                >
                  {email}
                </a>
              </p>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 sm:mt-6 sm:gap-2.5">
              {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 transition-colors hover:border-[#6254f3]/50 hover:bg-[#6254f3]/20 hover:text-white"
                >
                  <Icon className="size-3.5" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:contents sm:gap-0">
            <FooterColumn title="Shop" className="lg:col-span-2">
              <ul className="space-y-2.5 sm:space-y-3">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}>
                    <FooterLink href={href}>{label}</FooterLink>
                  </li>
                ))}
                <li>
                  <FooterLink href="/cart">Shopping cart</FooterLink>
                </li>
              </ul>
            </FooterColumn>

            <FooterColumn title="Customer support" className="lg:col-span-2">
              <ul className="space-y-2.5 sm:space-y-3">
                {SUPPORT_LINKS.map(({ href, label }) => (
                  <li key={label}>
                    <FooterLink href={href}>{label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FooterColumn>
          </div>

          <FooterColumn
            title="Stay in the loop"
            className="sm:col-span-2 lg:col-span-4"
          >
            <p className="max-w-md text-sm leading-relaxed text-white/65">
              Subscribe for new arrivals, exclusive offers, and curated picks
              from our catalog.
            </p>
            <FooterNewsletter />

            <div className="mt-6 sm:mt-8">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-white/50 uppercase sm:text-xs">
                We accept
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/75 sm:px-2.5 sm:text-[11px]"
                  >
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </FooterColumn>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div
          className="mx-auto flex w-full max-w-[1600px] flex-col items-center gap-3 py-5 text-center text-xs text-white/55 sm:flex-row sm:justify-between sm:gap-4 sm:py-6 sm:text-left sm:text-sm"
          style={FOOTER_GUTTER}
        >
          <p className="max-w-full">
            © {year} {STORE_NAME}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-end sm:gap-x-6">
            {LEGAL_LINKS.map(({ href, label }) => (
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
