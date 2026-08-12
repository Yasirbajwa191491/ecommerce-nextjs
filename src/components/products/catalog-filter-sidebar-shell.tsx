"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Desktop/tablet filter shell — sticky column with internal scroll for long filter lists. */
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
        "md:sticky md:top-24 md:z-10 md:flex md:max-h-[calc(100vh-7rem)] md:self-start md:overflow-hidden",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-5 lg:p-6">
        {children}
      </div>
    </div>
  );
}
