"use client";

import { ShieldCheck } from "lucide-react";
import type { ProductDisplaySource } from "@/lib/product-display-helpers";
import { getWarrantyLabel } from "@/lib/product-display-helpers";
import { cn } from "@/lib/utils";

type ProductWarrantyBadgeProps = {
  product: ProductDisplaySource;
  className?: string;
  showDetails?: boolean;
};

export function ProductWarrantyBadge({
  product,
  className,
  showDetails = false,
}: ProductWarrantyBadgeProps) {
  const label = getWarrantyLabel(product);
  if (!label) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm",
        className
      )}
    >
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#6254f3]" />
      <div>
        <p className="font-medium text-foreground">Warranty</p>
        <p className="text-muted-foreground">{label}</p>
        {showDetails && product.warrantyDetails?.trim() ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {product.warrantyDetails.trim()}
          </p>
        ) : null}
      </div>
    </div>
  );
}
