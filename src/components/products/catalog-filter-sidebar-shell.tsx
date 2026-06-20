import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Desktop/tablet filter shell — sticky panel with viewport height from globals.css.
 * Filter sections scroll inside the panel; the shell height stays fixed while scrolling.
 */
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
        "hidden min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm",
        "md:sticky md:top-36 md:z-10 md:flex md:p-5 lg:top-24 lg:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
