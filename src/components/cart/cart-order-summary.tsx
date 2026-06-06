"use client";

import Link from "next/link";
import {
  ArrowRight,
  Lock,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import FormatPrice from "@/helpers/FormatPrice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CartOrderSummaryProps = {
  totalItem: number;
  subtotal: number;
  tax?: number;
  className?: string;
};

const trustItems = [
  { icon: Truck, label: "Fast delivery" },
  { icon: RefreshCw, label: "Easy returns" },
  { icon: Lock, label: "Secure checkout" },
] as const;

export function CartOrderSummary({
  totalItem,
  subtotal,
  tax = 0,
  className,
}: CartOrderSummaryProps) {
  const total = subtotal + tax;

  return (
    <Card
      className={cn(
        "overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-foreground/5",
        className
      )}
    >
      <CardHeader className="space-y-4 border-b border-border/60 bg-muted/20 px-6 py-6 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-[#6254f3]/10 text-[#6254f3]">
            <ShoppingBag className="size-5" />
          </span>
          <div>
            <CardTitle className="text-lg font-bold">Order summary</CardTitle>
            <p className="text-sm text-muted-foreground">
              {totalItem} {totalItem === 1 ? "item" : "items"} ready to checkout
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-6 py-6 sm:px-7">
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold tabular-nums text-foreground">
              <FormatPrice price={subtotal} />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estimated tax</span>
            <span className="font-semibold tabular-nums text-foreground">
              <FormatPrice price={tax} />
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="text-sm font-semibold text-emerald-600">
              Calculated at checkout
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl bg-[#6254f3]/8 px-4 py-4 ring-1 ring-[#6254f3]/15">
          <span className="text-base font-semibold text-foreground">Total</span>
          <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
            <FormatPrice price={total} />
          </span>
        </div>

        <ul className="grid grid-cols-3 gap-2 pt-1">
          {trustItems.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2.5 text-center"
            >
              <Icon className="size-4 text-[#6254f3]" />
              <span className="text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
                {label}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col items-center gap-4 border-t border-border/60 bg-muted/15 px-6 py-6 sm:px-7">
        <div className="flex w-full flex-col items-center gap-3">
          <Button
            render={<Link href="/checkout" />}
            className="group h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white"
          >
            Proceed to checkout
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            render={<Link href="/products" />}
            variant="ghost"
            className="h-10 gap-2 rounded-full px-6 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <ShoppingBag className="size-4 shrink-0" />
            Continue shopping
          </Button>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <Lock className="size-3 shrink-0" />
          Your payment information is encrypted and secure
        </p>
      </CardFooter>
    </Card>
  );
}
