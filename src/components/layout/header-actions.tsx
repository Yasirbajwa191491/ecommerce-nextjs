"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartContext } from "@/context/cart_context";

export function HeaderCart() {
  const { total_item } = useCartContext();

  return (
    <Link
      href="/cart"
      aria-label={`Shopping cart, ${total_item} items`}
      className="group relative flex shrink-0 items-center justify-center transition-opacity duration-200 hover:opacity-80"
      style={{ paddingRight: "0.5rem", paddingLeft: "0.25rem" }}
    >
      <ShoppingCart
        className="size-8 text-foreground sm:size-9"
        strokeWidth={1.75}
      />
      <span
        className={cn(
          "absolute top-0.5 right-0 flex min-w-[1.35rem] items-center justify-center rounded-full bg-[#6254f3] px-1 text-[0.7rem] font-semibold leading-none text-white tabular-nums",
          "h-[1.35rem] sm:min-w-[1.5rem] sm:h-[1.5rem] sm:text-xs"
        )}
      >
        {total_item > 99 ? "99+" : total_item}
      </span>
    </Link>
  );
}
