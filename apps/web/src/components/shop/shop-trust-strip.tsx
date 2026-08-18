"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SHOP_BODY_SM } from "@/lib/typography";

export type TrustItem = {
  icon: LucideIcon;
  label: string;
};

type ShopTrustStripProps = {
  items: readonly TrustItem[];
  variant?: "inline" | "grid";
  className?: string;
};

export function ShopTrustStrip({
  items,
  variant = "grid",
  className,
}: ShopTrustStripProps) {
  if (variant === "inline") {
    return (
      <ul
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-6 gap-y-3",
          SHOP_BODY_SM,
          className
        )}
      >
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="inline-flex items-center gap-2 font-medium text-foreground">
            <Icon className="size-4 text-brand-primary" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={cn("grid grid-cols-3 gap-2 pt-1", className)}>
      {items.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2.5 text-center"
        >
          <Icon className="size-4 text-brand-primary" aria-hidden />
          <span className={cn("leading-tight", SHOP_BODY_SM)}>{label}</span>
        </li>
      ))}
    </ul>
  );
}
