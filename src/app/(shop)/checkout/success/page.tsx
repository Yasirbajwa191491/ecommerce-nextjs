"use client";

import { useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc } from "../../../../../convex/_generated/dataModel";
import FormatPrice from "@/helpers/FormatPrice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCartContext } from "@/context/cart_context";
import { cn } from "@/lib/utils";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCartContext();

  const orderNumber =
    searchParams.get("orderNumber") ??
    (typeof window !== "undefined"
      ? sessionStorage.getItem("lastOrderNumber")
      : null);
  const customerEmail =
    typeof window !== "undefined"
      ? sessionStorage.getItem("lastOrderEmail") ?? undefined
      : undefined;

  const orderData = useQuery(
    api.orders.getOrderByNumber,
    orderNumber
      ? { orderNumber, customerEmail }
      : "skip"
  );

  useEffect(() => {
    if (orderData?.order) {
      clearCart();
      sessionStorage.removeItem("lastOrderNumber");
      sessionStorage.removeItem("lastOrderEmail");
    }
  }, [orderData?.order, clearCart]);

  const isLoading = orderNumber && orderData === undefined;
  const order = orderData?.order;
  const items = orderData?.items ?? [];

  const statusMessage = useMemo(() => {
    if (!order) return null;
    if (order.paymentMethod === "stripe" && order.paymentStatus === "pending") {
      return "We are confirming your payment. This may take a moment.";
    }
    if (order.paymentMethod === "cod") {
      return "Your order has been placed. Please prepare payment on delivery.";
    }
    if (order.paymentStatus === "paid") {
      return "Your payment was successful and your order is confirmed.";
    }
    return "Your order has been received.";
  }, [order]);

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          We could not find your order details.
        </p>
        <Button render={<Link href="/products" />} className="mt-6">
          Continue shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-8 sm:py-14">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-[#6254f3]" />
            <p>Loading your order…</p>
          </div>
        ) : !order ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Order not found</h1>
            <p className="mt-2 text-muted-foreground">
              This order could not be retrieved. Check your email for confirmation.
            </p>
            <Button render={<Link href="/products" />} className="mt-6">
              Continue shopping
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden rounded-2xl border-border/60 shadow-lg">
            <CardHeader className="space-y-4 border-b border-border/60 bg-muted/20 px-6 py-8 text-center sm:px-8">
              <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                {order.paymentMethod === "stripe" &&
                order.paymentStatus === "pending" ? (
                  <Clock3 className="size-8" />
                ) : (
                  <CheckCircle2 className="size-8" />
                )}
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl">
                  {order.paymentMethod === "stripe" &&
                  order.paymentStatus === "pending"
                    ? "Payment processing"
                    : "Order confirmed!"}
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  {statusMessage}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-8 sm:px-8">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm text-muted-foreground">Order number</p>
                <p className="mt-1 text-lg font-bold tracking-wide text-foreground">
                  {order.orderNumber}
                </p>
              </div>

              <div className="space-y-3">
                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  <Package className="size-4" />
                  Items ordered
                </h2>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                  {items.map((item: Doc<"orderItems">) => (
                    <li
                      key={item._id}
                      className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {item.productName} × {item.quantity}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Color: {item.color}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums">
                        <FormatPrice price={item.lineTotal} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[#6254f3]/8 px-4 py-4 ring-1 ring-[#6254f3]/15">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="text-xl font-bold tabular-nums">
                    <FormatPrice price={order.total} />
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  render={<Link href="/products" />}
                  className="h-11 flex-1 gap-2 rounded-full bg-[#6254f3] hover:bg-[#5548e0]"
                >
                  <ShoppingBag className="size-4" />
                  Continue shopping
                </Button>
                <Button
                  render={<Link href="/contact" />}
                  variant="outline"
                  className="h-11 flex-1 rounded-full"
                >
                  Contact support
                </Button>
              </div>

              <p
                className={cn(
                  "text-center text-xs text-muted-foreground",
                  order.paymentMethod === "stripe" &&
                    order.paymentStatus === "pending" &&
                    "animate-pulse"
                )}
              >
                A confirmation email will be sent to {order.customerEmail}.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-[#6254f3]" />
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
