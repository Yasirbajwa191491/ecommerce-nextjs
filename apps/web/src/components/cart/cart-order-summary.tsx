"use client";

import Link from "next/link";
import {
  ArrowRight,
  Lock,
  RefreshCw,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderSummaryBreakdown } from "@/components/orders/order-summary-breakdown";
import { cn } from "@/lib/utils";
import { SHOP_BODY, SHOP_BODY_SM } from "@/lib/typography";

type CartOrderSummaryProps = {
  totalItem: number;
  subtotal: number;
  discountTotal?: number;
  shipping?: number;
  tax?: number;
  total: number;
  currency?: string;
  isLoading?: boolean;
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
  discountTotal = 0,
  shipping = 0,
  tax = 0,
  total,
  currency,
  isLoading = false,
  className,
}: CartOrderSummaryProps) {
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
            <p className={SHOP_BODY}>
              {totalItem} {totalItem === 1 ? "item" : "items"} ready to checkout
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-6 py-6 sm:px-7">
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

        <ul className="grid grid-cols-3 gap-2 pt-1">
          {trustItems.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex flex-col items-center gap-1.5 rounded-lg bg-muted/30 px-2 py-2.5 text-center"
            >
              <Icon className="size-4 text-[#6254f3]" />
              <span className={cn("leading-tight", SHOP_BODY_SM)}>
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
        <p className={cn("flex items-center justify-center gap-1.5 text-center", SHOP_BODY_SM)}>
          <Lock className="size-3 shrink-0" />
          Your payment information is encrypted and secure
        </p>
      </CardFooter>
    </Card>
  );
}
