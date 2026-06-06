"use client";

import FormatPrice from "@/helpers/FormatPrice";
import {
  CartProductImage,
  ColorSwatch,
  QuantityDisplay,
} from "@/components/cart/cart-product-display";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CartItem } from "@/reducer/cartReducer";

export function CheckoutItemMobile({ item }: { item: CartItem }) {
  const lineTotal = item.price * item.amount;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <CartProductImage item={item} />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
            {item.name}
          </h3>
          <p className="text-sm font-medium tabular-nums text-muted-foreground">
            <FormatPrice price={item.price} /> each
          </p>
          <ColorSwatch color={item.color} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/25 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Quantity
          </p>
          <div className="mt-1">
            <QuantityDisplay amount={item.amount} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Line total
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            <FormatPrice price={lineTotal} />
          </p>
        </div>
      </div>
    </article>
  );
}

export function CheckoutItemRow({ item }: { item: CartItem }) {
  const lineTotal = item.price * item.amount;

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="whitespace-normal py-6 pl-8 pr-4 xl:pl-10">
        <div className="flex min-w-0 items-center gap-5">
          <CartProductImage item={item} size="lg" />
          <div className="min-w-0 space-y-2.5">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {item.name}
            </h3>
            <ColorSwatch color={item.color} />
          </div>
        </div>
      </TableCell>

      <TableCell className="w-32 py-6 text-right font-semibold tabular-nums text-foreground">
        <FormatPrice price={item.price} />
      </TableCell>

      <TableCell className="w-44 whitespace-normal py-6">
        <div className="flex justify-center">
          <QuantityDisplay amount={item.amount} />
        </div>
      </TableCell>

      <TableCell className="w-32 py-6 pr-8 text-right text-base font-bold tabular-nums text-foreground xl:pr-10">
        <FormatPrice price={lineTotal} />
      </TableCell>
    </TableRow>
  );
}
