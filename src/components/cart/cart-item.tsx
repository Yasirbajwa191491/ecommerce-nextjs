"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { m, useReducedMotion } from "framer-motion";
import FormatPrice from "@/helpers/FormatPrice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CartProductImage,
  ColorSwatch,
} from "@/components/cart/cart-product-display";
import {
  CartLinePricingDetails,
  type CartPricedLine,
} from "@/components/cart/cart-line-pricing";
import type { CartItem as CartItemType } from "@/reducer/cartReducer";
import { listItem } from "@/lib/motion";

type CartItemProps = {
  item: CartItemType;
  pricedLine?: CartPricedLine;
  currency?: string;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  onRemove: (id: string) => void;
};

function StockBadge({ max, amount }: { max: number; amount: number }) {
  const lowStock = max - amount <= 5;

  return (
    <Badge
      variant="outline"
      className={cn(
        "w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold",
        lowStock
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {lowStock ? `Only ${max} left` : `${max} in stock`}
    </Badge>
  );
}

function QuantityStepper({
  item,
  onIncrement,
  onDecrement,
}: Pick<CartItemProps, "item" | "onIncrement" | "onDecrement">) {
  const reduceMotion = useReducedMotion();
  const atMax = item.amount >= item.max;
  const atMin = item.amount <= 1;

  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-border/70 bg-muted/30 p-1 shadow-sm">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onDecrement(item.id)}
        disabled={atMin}
        aria-label={`Decrease quantity of ${item.name}`}
        className="size-8 rounded-lg bg-background shadow-sm hover:bg-background disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </Button>
      {reduceMotion ? (
        <span className="min-w-10 text-center text-sm font-bold tabular-nums text-foreground">
          {item.amount}
        </span>
      ) : (
        <m.span
          key={item.amount}
          initial={{ scale: 1.2, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 25 }}
          className="min-w-10 text-center text-sm font-bold tabular-nums text-foreground"
        >
          {item.amount}
        </m.span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => onIncrement(item.id)}
        disabled={atMax}
        aria-label={`Increase quantity of ${item.name}`}
        className="size-8 rounded-lg bg-background shadow-sm hover:bg-background disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </Button>
    </div>
  );
}

function RemoveButton({
  item,
  onRemove,
  showLabel = false,
}: {
  item: CartItemType;
  onRemove: (id: string) => void;
  showLabel?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      onClick={() => onRemove(item.id)}
      aria-label={`Remove ${item.name} from cart`}
      className={cn(
        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
        showLabel && "gap-1.5 px-2.5"
      )}
    >
      <Trash2 className="size-4" />
      {showLabel ? <span className="text-xs font-medium">Remove</span> : null}
    </Button>
  );
}

export function CartItemMobile({
  item,
  pricedLine,
  currency,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) {
  const reduceMotion = useReducedMotion();
  const lineTotal = pricedLine?.lineTotal ?? item.price * item.amount;

  const article = (
    <article className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex gap-4">
        <CartProductImage item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground">
              {item.name}
            </h3>
            <RemoveButton item={item} onRemove={onRemove} />
          </div>
          {pricedLine ? (
            <div className="mt-1">
              <CartLinePricingDetails
                priced={pricedLine}
                currency={currency}
              />
            </div>
          ) : (
            <p className="mt-1 text-sm font-medium tabular-nums text-muted-foreground">
              <FormatPrice price={item.price} currency={currency} /> each
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ColorSwatch color={item.color} />
            <StockBadge max={item.max} amount={item.amount} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/25 px-4 py-3">
        <QuantityStepper
          item={item}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Line total
          </p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
            <FormatPrice price={lineTotal} currency={currency} />
          </p>
        </div>
      </div>
    </article>
  );

  if (reduceMotion) return article;

  return (
    <m.div
      layout
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={listItem}
    >
      {article}
    </m.div>
  );
}

export function CartItemRow({
  item,
  pricedLine,
  currency,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemProps) {
  const lineTotal = pricedLine?.lineTotal ?? item.price * item.amount;

  return (
    <TableRow className="hover:bg-muted/20">
      <TableCell className="whitespace-normal py-6 pl-8 pr-4 xl:pl-10">
        <div className="flex min-w-0 items-center gap-5">
          <CartProductImage item={item} size="lg" />
          <div className="min-w-0 space-y-2.5">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {item.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <ColorSwatch color={item.color} />
              <StockBadge max={item.max} amount={item.amount} />
            </div>
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
          <QuantityStepper
            item={item}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        </div>
      </TableCell>

      <TableCell className="w-32 py-6 text-right text-base font-bold tabular-nums text-foreground">
        <FormatPrice price={lineTotal} currency={currency} />
      </TableCell>

      <TableCell className="w-28 whitespace-normal py-6 pr-8 text-right xl:pr-10">
        <RemoveButton item={item} onRemove={onRemove} showLabel />
      </TableCell>
    </TableRow>
  );
}
