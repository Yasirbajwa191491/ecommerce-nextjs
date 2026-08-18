import Link from "next/link";
import {
  ArrowLeft,
  FileQuestion,
  Home,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { PRIMARY_BUTTON_CLASS, OUTLINE_BUTTON_CLASS } from "@/lib/layout-constants";
import { STORE_NAME } from "@/lib/site";
import {
  SHOP_BODY,
  SHOP_EYEBROW,
  SHOP_PAGE_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

export type NotFoundPageVariant = "shop" | "admin" | "admin-dashboard";

type NotFoundPageViewProps = {
  variant: NotFoundPageVariant;
  title?: string;
  description?: string;
};

export function NotFoundPageView({
  variant,
  title = "Page not found",
  description = "The page you're looking for doesn't exist or may have been moved.",
}: NotFoundPageViewProps) {
  const isAdmin = variant === "admin" || variant === "admin-dashboard";
  const isEmbedded = variant === "admin-dashboard";
  const primaryHref = isAdmin ? "/admin/home" : "/home";

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center px-4",
        isEmbedded ? "py-12" : "min-h-[50vh] py-16 sm:min-h-[60vh] sm:py-20"
      )}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-black/5 sm:p-8",
          isEmbedded && "max-w-2xl"
        )}
      >
        <p className="text-6xl font-bold tracking-tight text-[#6254f3]/20 sm:text-7xl">
          404
        </p>
        <div className="-mt-2 mb-6 flex size-12 items-center justify-center rounded-xl bg-muted/80">
          <FileQuestion
            className="size-6 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
        </div>

        <p className={cn(isAdmin ? "text-xs font-medium tracking-wide text-muted-foreground uppercase" : SHOP_EYEBROW)}>
          {isAdmin ? "Admin" : STORE_NAME}
        </p>
        <h1 className={cn(isAdmin ? "text-2xl font-semibold tracking-tight text-foreground sm:text-3xl" : SHOP_PAGE_TITLE)}>
          {title}
        </h1>
        <p className={cn("mt-3", isAdmin ? "text-sm leading-relaxed text-muted-foreground sm:text-base" : SHOP_BODY)}>
          {description}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
          <Link href={primaryHref} className={cn(PRIMARY_BUTTON_CLASS, "group inline-flex items-center justify-center")}>
            {isAdmin ? (
              <LayoutDashboard className="size-4" aria-hidden />
            ) : (
              <Home className="size-4" aria-hidden />
            )}
            {isAdmin ? "Back to dashboard" : "Back to home"}
          </Link>
          {!isAdmin && (
            <Link href="/products" className={OUTLINE_BUTTON_CLASS}>
              <Search className="size-4" aria-hidden />
              Browse products
            </Link>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm">
          {isAdmin && (
            <Link
              href="/home"
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              View storefront
            </Link>
          )}
          {!isAdmin && (
            <Link
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact us
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
