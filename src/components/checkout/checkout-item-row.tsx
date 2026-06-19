"use client";

import FormatPrice from "@/helpers/FormatPrice";
import {
  CartProductImage,
  ColorSwatch,
  QuantityDisplay,
} from "@/components/cart/cart-product-display";
import {
  CartLinePricingDetails,
  type CartPricedLine,
} from "@/components/cart/cart-line-pricing";
import { TableCell, TableRow } from "@/components/ui/table";
import type { CartItem } from "@/reducer/cartReducer";
import {
  SHOP_LINE_ITEM_META,
  SHOP_LINE_ITEM_PRICE,
  SHOP_LINE_ITEM_TITLE,
  SHOP_META_LABEL,
} from "@/lib/typography";
import { cn } from "@/lib/utils";

type CheckoutItemProps = {
  item: CartItem;
  pricedLine?: CartPricedLine;
  currency?: string;
};

export function CheckoutItemMobile({
  item,
  pricedLine,
  currency,
}: CheckoutItemProps) {
  const lineTotal = pricedLine?.lineTotal ?? item.price * item.amount;

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <CartProductImage item={item} />
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className={cn("line-clamp-2 leading-snug", SHOP_LINE_ITEM_TITLE)}>
            {item.name}
          </h3>
          {pricedLine ? (
            <CartLinePricingDetails priced={pricedLine} currency={currency} />
          ) : (
            <p className={cn("font-medium tabular-nums", SHOP_LINE_ITEM_META)}>
              <FormatPrice price={item.price} currency={currency} /> each
            </p>
          )}
          <ColorSwatch color={item.color} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/25 px-4 py-3">
        <div>
          <p className={SHOP_META_LABEL}>Quantity</p>
          <div className="mt-1">
            <QuantityDisplay amount={item.amount} />
          </div>
        </div>
        <div className="text-right">
          <p className={SHOP_META_LABEL}>Line total</p>
          <p className={cn("mt-0.5", SHOP_LINE_ITEM_PRICE)}>
            <FormatPrice price={lineTotal} currency={currency} />
          </p>
        </div>
      </div>
    </article>
  );
}

export function CheckoutItemRow({
  item,
  pricedLine,
  currency,
}: CheckoutItemProps) {
  const lineTotal = pricedLine?.lineTotal ?? item.price * item.amount;

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="whitespace-normal py-6 pl-8 pr-4 xl:pl-10">
        <div className="flex min-w-0 items-center gap-5">
          <CartProductImage item={item} size="lg" />
          <div className="min-w-0 space-y-2.5">
            <h3 className={cn("leading-snug", SHOP_LINE_ITEM_TITLE)}>
              {item.name}
            </h3>
            <ColorSwatch color={item.color} />
          </div>
        </div>
      </TableCell>

      <TableCell className="w-40 whitespace-normal py-6 text-right">
        {pricedLine ? (
          <CartLinePricingDetails
            priced={pricedLine}
            currency={currency}
            compact
            className="items-end text-right"
          />
        ) : (
          <span className="font-semibold tabular-nums text-foreground">
            <FormatPrice price={item.price} currency={currency} />
          </span>
        )}
      </TableCell>

      <TableCell className="w-44 whitespace-normal py-6">
        <div className="flex justify-center">
          <QuantityDisplay amount={item.amount} />
        </div>
      </TableCell>

      <TableCell className="w-32 py-6 pr-8 text-right xl:pr-10">
        <span className={SHOP_LINE_ITEM_PRICE}>
          <FormatPrice price={lineTotal} currency={currency} />
        </span>
      </TableCell>
    </TableRow>
  );
}
