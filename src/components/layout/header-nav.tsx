"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/site";

type HeaderNavProps = {
  orientation?: "horizontal" | "vertical";
  linkClassName?: string;
  onNavigate?: () => void;
};

function isNavActive(pathname: string, href: string) {
  if (href === "/home") {
    return pathname === "/home" || pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HeaderNav({
  orientation = "horizontal",
  linkClassName,
  onNavigate,
}: HeaderNavProps) {
  const pathname = usePathname();
  const vertical = orientation === "vertical";

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        vertical
          ? "flex flex-col gap-0.5"
          : "flex items-center justify-center gap-0.5 sm:gap-1"
      )}
    >
      {NAV_LINKS.map(({ href, label }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "group relative rounded-lg px-3.5 py-2 text-sm font-medium tracking-tight transition-all duration-200",
              vertical ? "text-base" : "text-[0.8125rem] sm:text-sm",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              linkClassName
            )}
          >
            <span className="relative z-10">{label}</span>
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-2 bottom-1.5 h-px origin-center rounded-full bg-foreground transition-transform duration-300 ease-out",
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-75"
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
