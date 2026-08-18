"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin/email-marketing", label: "Overview", exact: true },
  { href: "/admin/email-marketing/templates", label: "Templates" },
  { href: "/admin/email-marketing/campaigns", label: "Campaigns" },
  { href: "/admin/email-marketing/subscribers", label: "Subscribers" },
] as const;

export function EmailMarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto rounded-lg border bg-muted/30 p-1 scrollbar-none">
      <div className="flex min-w-max gap-1 sm:min-w-0 sm:flex-wrap">
        {LINKS.map((link) => {
          const active =
            "exact" in link && link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors sm:py-1.5",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
