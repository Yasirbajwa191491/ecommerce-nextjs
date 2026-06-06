"use client";

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
import { Skeleton } from "@/components/ui/skeleton";
import { CheckoutItemMobile, CheckoutItemRow } from "@/components/checkout/checkout-item-row";
import { OrderSummaryBreakdown } from "@/components/orders/order-summary-breakdown";
import type { CartPricedLine } from "@/components/cart/cart-line-pricing";
import { cn } from "@/lib/utils";
import type { CartItem } from "@/reducer/cartReducer";
import { Package } from "lucide-react";

type CheckoutOrderSummaryProps = {
  cart: CartItem[];
  subtotal: number;
  discountTotal?: number;
  tax?: number;
  shipping?: number;
  total: number;
  currency?: string;
  isLoading?: boolean;
  getPricedLine?: (item: CartItem) => CartPricedLine | undefined;
  className?: string;
};

export function CheckoutOrderSummary({
  cart,
  subtotal,
  discountTotal = 0,
  tax = 0,
  shipping = 0,
  total,
  currency,
  isLoading = false,
  getPricedLine,
  className,
}: CheckoutOrderSummaryProps) {
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
            <CheckoutItemMobile
              key={item.id}
              item={item}
              pricedLine={getPricedLine?.(item)}
              currency={currency}
            />
          ))}
        </div>

        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                <TableHead className="h-12 py-4 pl-8 text-xs font-bold tracking-wider text-foreground/70 uppercase xl:pl-10">
                  Product
                </TableHead>
                <TableHead className="h-12 w-40 py-4 text-right text-xs font-bold tracking-wider text-foreground/70 uppercase">
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
                <CheckoutItemRow
                  key={item.id}
                  item={item}
                  pricedLine={getPricedLine?.(item)}
                  currency={currency}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg ring-1 ring-foreground/5">
        <CardHeader className="border-b border-border/60 bg-muted/20 px-6 py-5">
          <CardTitle className="text-base font-bold">Price details</CardTitle>
        </CardHeader>
        <CardContent className="px-6 py-6">
          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <OrderSummaryBreakdown
              subtotal={subtotal}
              discountTotal={discountTotal}
              shipping={shipping}
              tax={tax}
              total={total}
              currency={currency}
              showProductsLabel
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
