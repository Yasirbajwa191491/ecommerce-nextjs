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
import { NAV_LINKS, STORE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

const FOOTER_GUTTER = "clamp(1.25rem, 4vw, 4.8rem)";

const SUPPORT_LINKS = [
  { href: "/contact", label: "Contact us" },
  { href: "/contact", label: "Shipping & delivery" },
  { href: "/contact", label: "Returns & refunds" },
  { href: "/contact", label: "Order tracking" },
] as const;

const LEGAL_LINKS = [
  { href: "/about", label: "Privacy policy" },
  { href: "/about", label: "Terms of service" },
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

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#0a1435] text-white">
      <div
        className="mx-auto w-full max-w-[1600px] py-12 lg:py-14"
        style={{ paddingLeft: FOOTER_GUTTER, paddingRight: FOOTER_GUTTER }}
      >
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-4">
            <Link
              href="/home"
              className="text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-90"
            >
              {STORE_NAME}
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Quality products across every category — electronics, furniture,
              kitchen, office, and more. Shop with confidence and fast delivery.
            </p>

            <div className="mt-6 space-y-3 text-sm text-white/70">
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-[#a89cff]" />
                <span>DHA Phase 6 Lahore, Pakistan, 54000</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="size-4 shrink-0 text-[#a89cff]" />
                <a
                  href="tel:+18005550199"
                  className="transition-colors hover:text-[#a89cff]"
                >
                  +1 (800) 555-0199
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="size-4 shrink-0 text-[#a89cff]" />
                <a
                  href="mailto:yasir.sohail@savari.io"
                  className="transition-colors hover:text-[#a89cff]"
                >
                  yasir.sohail@savari.io
                </a>
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2.5">
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

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
              Shop
            </h3>
            <ul className="mt-4 space-y-3">
              {NAV_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <FooterLink href={href}>{label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="/cart">Shopping cart</FooterLink>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
              Customer support
            </h3>
            <ul className="mt-4 space-y-3">
              {SUPPORT_LINKS.map(({ href, label }) => (
                <li key={label}>
                  <FooterLink href={href}>{label}</FooterLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
              Stay in the loop
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Subscribe for new arrivals, exclusive offers, and curated picks
              from our catalog.
            </p>
            <FooterNewsletter />

            <div className="mt-8">
              <p className="text-xs font-semibold tracking-wide text-white/50 uppercase">
                We accept
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <span
                    key={method}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/75"
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
          className="mx-auto flex w-full max-w-[1600px] flex-col items-center justify-between gap-4 py-6 text-sm text-white/55 sm:flex-row"
          style={{ paddingLeft: FOOTER_GUTTER, paddingRight: FOOTER_GUTTER }}
        >
          <p>
            © {year} {STORE_NAME}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
