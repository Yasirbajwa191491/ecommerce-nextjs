"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  Info,
  Mail,
  PackageSearch,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HOME_PATH, NAV_LINKS } from "@/lib/site";
import {
  HEADER_NAV_DRAWER_LABEL,
  HEADER_NAV_LINK,
} from "@/lib/typography";

const NAV_ICONS: Record<(typeof NAV_LINKS)[number]["label"], LucideIcon> = {
  Home,
  Products: Package,
  About: Info,
  Contact: Mail,
  "Track Order": PackageSearch,
};

type HeaderNavProps = {
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "drawer";
  linkClassName?: string;
  onNavigate?: () => void;
};

function isNavActive(pathname: string, href: string) {
  if (href === HOME_PATH) {
    return pathname === HOME_PATH || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({
  orientation = "horizontal",
  variant = "default",
  linkClassName,
  onNavigate,
}: HeaderNavProps) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";
  const drawer = variant === "drawer";

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        drawer
          ? "flex w-full flex-col gap-2"
          : vertical
            ? "flex flex-col gap-1"
            : "flex items-center lg:gap-4 xl:gap-5"
      )}
    >
      {NAV_LINKS.map(({ href, label }) => {
        const active = isNavActive(pathname, href);
        const Icon = NAV_ICONS[label];

        if (drawer) {
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "group flex h-14 w-full items-center gap-3.5 rounded-xl px-3 transition-colors duration-200",
                active
                  ? "bg-[#6254f3]/10 text-[#6254f3]"
                  : "text-foreground hover:bg-muted/60",
                linkClassName
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-[#6254f3] text-white shadow-sm"
                    : "bg-muted text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground"
                )}
              >
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <span className={HEADER_NAV_DRAWER_LABEL}>
                {label}
              </span>
              <ChevronRight
                className={cn(
                  "size-4 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground",
                  active && "text-[#6254f3]/80"
                )}
                aria-hidden
              />
            </Link>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              HEADER_NAV_LINK,
              "transition-colors duration-200",
              vertical ? "py-2.5 text-lg sm:text-xl" : "",
              active
                ? "text-[#6254f3]"
                : "text-foreground/85 hover:text-[#6254f3]",
              linkClassName
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
