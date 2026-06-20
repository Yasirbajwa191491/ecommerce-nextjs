import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Desktop/tablet filter shell — sticky column, natural height; page scrolls (not the panel). */
export function CatalogFilterSidebarShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      id="catalog-filter-sidebar"
      className={cn(
        "hidden min-w-0 flex-col rounded-2xl border border-border/60 bg-card shadow-sm",
        "md:sticky md:top-36 md:z-10 md:flex md:self-start md:p-5 lg:top-24 lg:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
