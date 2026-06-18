"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CartItem as CartItemType } from "@/reducer/cartReducer";

export function ColorSwatch({
  color,
  showLabel = true,
  label = "Selected color",
}: {
  color: string;
  showLabel?: boolean;
  label?: string;
}) {
  const dot = (
    <span
      aria-hidden={showLabel ? true : undefined}
      className="size-4 shrink-0 rounded-full border border-white/80 shadow-sm ring-1 ring-border/60"
      style={{ backgroundColor: color }}
    />
  );

  if (!showLabel) {
    return dot;
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1">
      {dot}
      <span className="text-xs font-medium text-foreground">{label}</span>
    </span>
  );
}

export function CartProductImage({
  item,
  size = "md",
}: {
  item: Pick<CartItemType, "image" | "name">;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border/60 shadow-sm",
        size === "lg" ? "size-28" : "size-20 sm:size-24"
      )}
    >
      {item.image ? (
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes={size === "lg" ? "112px" : "96px"}
          className="object-cover"
        />
      ) : (
        <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}
    </div>
  );
}

export function QuantityDisplay({ amount }: { amount: number }) {
  return (
    <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-xl border border-border/70 bg-muted/30 px-3 text-sm font-bold tabular-nums text-foreground">
      {amount}
    </span>
  );
}
