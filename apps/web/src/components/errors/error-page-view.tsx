"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Home,
  LayoutDashboard,
  RefreshCw,
  Store,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";
import { STORE_NAME } from "@/lib/site";

const ADMIN_ACCENT = "#6254f3";

export type ErrorPageVariant = "shop" | "admin" | "admin-dashboard" | "global";

type ErrorPageViewProps = {
  variant: ErrorPageVariant;
  title?: string;
  description?: string;
  error?: Error & { digest?: string };
  reset?: () => void;
};

export function ErrorPageView({
  variant,
  title = "Something went wrong",
  description,
  error,
  reset,
}: ErrorPageViewProps) {
  const message =
    description ?? (error ? getErrorMessage(error) : undefined);
  const isAdmin = variant === "admin" || variant === "admin-dashboard";
  const isEmbedded = variant === "admin-dashboard";
  const showDigest =
    process.env.NODE_ENV === "development" && error?.digest;

  const primaryHref = isAdmin ? "/admin/home" : "/home";
  const PrimaryIcon = isAdmin ? LayoutDashboard : Home;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center px-4",
        isEmbedded ? "py-12" : "min-h-[50vh] py-16 sm:min-h-[60vh] sm:py-20",
        variant === "global" && "min-h-dvh bg-[#f6f6f8]"
      )}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-black/5 sm:p-8",
          isEmbedded && "max-w-2xl"
        )}
      >
        <div
          className={cn(
            "mb-6 flex size-14 items-center justify-center rounded-2xl",
            isAdmin ? "bg-[#6254f3]/10" : "bg-primary/10"
          )}
        >
          {variant === "shop" ? (
            <Store
              className="size-7 text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
          ) : (
            <AlertTriangle
              className="size-7"
              style={isAdmin ? { color: ADMIN_ACCENT } : undefined}
              strokeWidth={1.75}
              aria-hidden
            />
          )}
        </div>

        <p
          className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          {isAdmin ? "Admin" : STORE_NAME}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {message ??
            "We hit an unexpected problem. You can try again or return to a safe page."}
        </p>

        {showDigest && (
          <p className="mt-4 rounded-lg bg-muted/60 px-3 py-2 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {reset && (
            <Button
              type="button"
              onClick={reset}
              className={cn(
                "h-11 gap-2",
                isAdmin &&
                  "bg-[#6254f3] hover:bg-[#5548e0] focus-visible:ring-[#6254f3]/30"
              )}
            >
              <RefreshCw className="size-4" aria-hidden />
              Try again
            </Button>
          )}
          <Link
            href={primaryHref}
            className={buttonVariants({
              variant: "outline",
              className: "h-11 gap-2",
            })}
          >
            <PrimaryIcon className="size-4" aria-hidden />
            {isAdmin ? "Back to dashboard" : "Back to home"}
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm">
          {variant === "shop" && (
            <Link
              href="/products"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Browse products
            </Link>
          )}
          {isAdmin && variant !== "admin-dashboard" && (
            <Link
              href="/admin/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin sign in
            </Link>
          )}
          {!isAdmin && (
            <Link
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact support
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/home"
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              View storefront
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
