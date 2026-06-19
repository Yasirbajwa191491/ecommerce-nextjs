"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { MotionCartBadge } from "@/components/motion";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/context/cart_context";

type HeaderCartProps = {
  compact?: boolean;
};

export function HeaderCart({ compact = false }: HeaderCartProps) {
  const { total_item } = useCartContext();

  return (
    <Link
      href="/cart"
      aria-label={`Shopping cart, ${total_item} items`}
      className={cn(
        "group relative flex shrink-0 items-center justify-center transition-opacity duration-200 hover:opacity-80",
        compact ? "size-10 p-2 sm:size-11" : ""
      )}
      style={
        compact
          ? undefined
          : { paddingRight: "0.5rem", paddingLeft: "0.25rem" }
      }
    >
      <ShoppingCart
        className={cn(
          "text-foreground",
          compact ? "size-7 sm:size-8" : "size-8 sm:size-9"
        )}
        strokeWidth={1.75}
      />
      {total_item > 0 ? (
        <MotionCartBadge
          count={total_item}
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-[#6254f3] font-semibold leading-none text-white",
            compact
              ? "top-0 right-0 h-[1.2rem] min-w-[1.2rem] px-0.5 text-[0.65rem]"
              : "top-0.5 right-0 h-[1.35rem] min-w-[1.35rem] px-1 text-[0.7rem] sm:min-w-[1.5rem] sm:h-[1.5rem] sm:text-xs"
          )}
        />
      ) : null}
    </Link>
  );
}
