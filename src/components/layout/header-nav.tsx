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
          ? "flex flex-col gap-1"
          : "flex items-center gap-6 lg:gap-10"
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
              "text-[0.9375rem] font-medium tracking-tight transition-colors duration-200 sm:text-base",
              vertical ? "py-2.5 text-lg" : "",
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
