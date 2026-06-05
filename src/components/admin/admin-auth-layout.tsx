"use client";

import Link from "next/link";
import {
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  Store,
} from "lucide-react";
import { STORE_NAME } from "@/lib/site";
import { cn } from "@/lib/utils";

type AdminAuthLayoutProps = {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  stepIndicator?: React.ReactNode;
  title: string;
  subtitle: React.ReactNode;
  mobileSubtitle?: string;
};

export function AdminAuthLayout({
  children,
  backHref = "/home",
  backLabel = "Back to store",
  stepIndicator,
  title,
  subtitle,
  mobileSubtitle = "Admin sign in",
}: AdminAuthLayoutProps) {
  return (
    <div className="grid items-start lg:min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-stretch">
      <aside
        className={cn(
          "relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between",
          "bg-[#6254f3] text-white"
        )}
        aria-hidden={false}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.35) 0%, transparent 55%), radial-gradient(ellipse 70% 50% at 90% 90%, rgba(0,0,0,0.2) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 flex flex-col gap-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <LayoutDashboard className="size-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Administration</p>
              <p className="text-lg font-semibold tracking-tight">{STORE_NAME}</p>
            </div>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Manage your store with confidence
            </h1>
            <p className="text-base leading-relaxed text-white/85">
              Secure access to products, categories, and team accounts — all in
              one place.
            </p>
          </div>

          <ul className="space-y-4 text-sm text-white/90">
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-white/90" />
              <span>Email verification and encrypted sessions</span>
            </li>
            <li className="flex items-start gap-3">
              <Store className="mt-0.5 size-5 shrink-0 text-white/90" />
              <span>Real-time catalog synced with your storefront</span>
            </li>
          </ul>
        </div>

        <p className="relative z-10 px-10 pb-10 text-xs text-white/60 xl:px-14">
          Authorized personnel only
        </p>
      </aside>

      <main className="flex w-full flex-col bg-background max-lg:h-auto lg:min-h-dvh">
        <div className="shrink-0 border-b bg-[#6254f3] px-4 py-4 text-white sm:px-6 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
              <LayoutDashboard className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{STORE_NAME}</p>
              <p className="text-xs text-white/80">{mobileSubtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col justify-start px-4 pt-4 pb-8 sm:px-8 sm:pt-5 md:px-10 md:pt-6 lg:flex-1 lg:justify-center lg:px-16 lg:py-10 xl:px-20">
          <div className="mx-auto w-full max-w-[420px]">
            <Link
              href={backHref}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground sm:mb-6 lg:mb-8"
            >
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>

            {stepIndicator}

            <div className="mb-5 space-y-2 sm:mb-6 lg:mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {subtitle}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-sm ring-1 ring-black/5 sm:p-6 md:p-8">
              {children}
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground sm:mt-6 lg:mt-8">
              Protected area · Session secured
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
