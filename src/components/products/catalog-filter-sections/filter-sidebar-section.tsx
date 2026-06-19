  "use client";

import type { ReactNode } from "react";
import { SHOP_META_LABEL } from "@/lib/typography";
import { cn } from "@/lib/utils";

/** Shared vertical rhythm for filter option lists (category, brand, etc.) */
export const FILTER_OPTION_LIST_CLASS = "flex flex-col gap-2";

type FilterSidebarSectionProps = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function FilterSidebarSection({
  title,
  children,
  className,
}: FilterSidebarSectionProps) {
  return (
    <section className={cn("space-y-3 py-5 first:pt-0 last:pb-0", className)}>
      <p className={SHOP_META_LABEL}>{title}</p>
      {children}
    </section>
  );
}

export function FilterSidebarSections({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col divide-y divide-border/60", className)}>
      {children}
    </div>
  );
}
