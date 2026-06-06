"use client";

import FormatPrice from "@/helpers/FormatPrice";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckoutItemMobile, CheckoutItemRow } from "@/components/checkout/checkout-item-row";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/reducer/cartReducer";
import { Package } from "lucide-react";

type CheckoutOrderSummaryProps = {
  cart: CartItem[];
  subtotal: number;
  tax?: number;
  shipping?: number;
  className?: string;
};

export function CheckoutOrderSummary({
  cart,
  subtotal,
  tax = 0,
  shipping = 0,
  className,
}: CheckoutOrderSummaryProps) {
  const total = subtotal + tax + shipping;
  const totalItems = cart.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md ring-1 ring-foreground/5">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#6254f3]/10 text-[#6254f3]">
              <Package className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-foreground">Order summary</h2>
              <p className="text-sm text-muted-foreground">
                {totalItems} {totalItems === 1 ? "item" : "items"} in your order
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4 lg:hidden">
          {cart.map((item) => (
            <CheckoutItemMobile key={item.id} item={item} />
          ))}
        </div>

        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-12 py-4 pl-8 text-xs font-bold tracking-wider text-foreground/70 uppercase xl:pl-10">
                  Product
                </TableHead>
                <TableHead className="h-12 w-32 py-4 text-right text-xs font-bold tracking-wider text-foreground/70 uppercase">
                  Unit price
                </TableHead>
                <TableHead className="h-12 w-44 py-4 text-center text-xs font-bold tracking-wider text-foreground/70 uppercase">
                  Quantity
                </TableHead>
                <TableHead className="h-12 w-32 py-4 text-right text-xs font-bold tracking-wider text-foreground/70 uppercase">
                  Subtotal
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.map((item) => (
                <CheckoutItemRow key={item.id} item={item} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-foreground/5">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <CardTitle className="text-base font-bold">Price details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-6 py-6">
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
              <span className="font-semibold tabular-nums text-emerald-600">
                {shipping === 0 ? "Free" : <FormatPrice price={shipping} />}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-[#6254f3]/8 px-4 py-4 ring-1 ring-[#6254f3]/15">
            <span className="text-base font-semibold text-foreground">Total</span>
            <span className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
              <FormatPrice price={total} />
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
