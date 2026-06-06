import Link from "next/link";
import {
  ArrowLeft,
  FileQuestion,
  Home,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STORE_NAME } from "@/lib/site";

const PRIMARY_BUTTON_CLASS =
  "group inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white";

const OUTLINE_BUTTON_CLASS =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#6254f3]/30 bg-background px-6 text-sm font-medium text-[#6254f3] transition-all hover:bg-[#6254f3]/8 hover:text-[#5548e0] [&_svg]:text-[#6254f3]";

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

        <p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {isAdmin ? "Admin" : STORE_NAME}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-start">
          <Link href={primaryHref} className={PRIMARY_BUTTON_CLASS}>
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
