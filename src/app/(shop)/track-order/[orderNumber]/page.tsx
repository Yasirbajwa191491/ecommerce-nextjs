"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAction } from "convex/react";
import Image from "next/image";
import { api } from "../../../../../convex/_generated/api";
import {
  OrderProgressTimeline,
  OrderStatusHistory,
} from "@/components/orders/order-progress-timeline";
import {
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/currencies";
import type { PublicOrderItem } from "@/types/order";
import { ColorSwatch } from "@/components/cart/cart-product-display";
import { OrderSummaryBreakdown } from "@/components/orders/order-summary-breakdown";
import { OrderItemPricing } from "@/components/orders/order-item-pricing";
import { ArrowLeft, Loader2 } from "lucide-react";

const PRIMARY_BUTTON_CLASS =
  "h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white";

function TrackOrderDetailContent() {
  const params = useParams();
  const orderNumber = decodeURIComponent(params.orderNumber as string);

  const getPublicOrderDetail = useAction(api.orderTracking.getPublicOrderDetail);

  const [result, setResult] = useState<
    Awaited<ReturnType<typeof getPublicOrderDetail>> | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    getPublicOrderDetail({ orderNumber })
      .then((response) => {
        if (!cancelled) setResult(response);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [getPublicOrderDetail, orderNumber]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#6254f3]" />
      </div>
    );
  }

  if (!result?.found) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-muted-foreground">
          {result?.message ??
            "We couldn't find an order with that number. Please check and try again."}
        </p>
        <Button
          render={<Link href="/track-order" />}
          className={`mt-6 ${PRIMARY_BUTTON_CLASS}`}
        >
          Back to tracking
        </Button>
      </div>
    );
  }

  const order = result.order;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:py-10">
      <Button
        variant="ghost"
        render={<Link href="/track-order" />}
        className="rounded-full px-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tracking
      </Button>

      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-[#6254f3]">
          Order tracking
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
          {order.orderNumber}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Placed on{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date(order.createdAt))}
        </p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
        <CardHeader>
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderProgressTimeline status={order.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
          <CardHeader>
            <CardTitle>Customer information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name: </span>
              {order.customerName}
            </p>
            <p>
              <span className="text-muted-foreground">Email: </span>
              {order.customerEmail}
            </p>
            <p>
              <span className="text-muted-foreground">Phone: </span>
              {order.customerPhone}
            </p>
            <p>
              <span className="text-muted-foreground">Address: </span>
              {order.customerAddress}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
          <CardHeader>
            <CardTitle>Payment information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Method</span>
              <PaymentMethodBadge method={order.paymentMethod} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Status</span>
              <PaymentStatusBadge status={order.paymentStatus} />
            </div>
            {order.paidAt ? (
              <p className="text-sm text-muted-foreground">
                Payment completed:{" "}
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(order.paidAt))}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
        <CardHeader>
          <CardTitle>Ordered products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item: PublicOrderItem, index: number) => (
            <div
              key={`${item.productName}-${index}`}
              className="flex gap-4 border-b pb-4 last:border-b-0 last:pb-0"
            >
              {item.imageUrl ? (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ColorSwatch color={item.color} />
                  <span>Qty {item.quantity}</span>
                  {item.sku ? <span>SKU {item.sku}</span> : null}
                  {item.size ? <span>Size {item.size}</span> : null}
                </div>
                <div className="mt-2 hidden sm:block">
                  <OrderItemPricing item={item} currency={order.currency} />
                </div>
              </div>
              <OrderItemPricing
                item={item}
                currency={order.currency}
                compact
                className="sm:hidden"
              />
              <div className="hidden shrink-0 sm:block">
                <p className="font-semibold tabular-nums">
                  {formatCurrencyAmount(item.lineTotal, order.currency)}
                </p>
              </div>
            </div>
          ))}
          <OrderSummaryBreakdown
            subtotal={order.subtotal}
            discountTotal={order.discountTotal}
            shipping={order.shipping}
            tax={order.tax}
            total={order.total}
            currency={order.currency}
            showProductsLabel
            className="mt-2"
          />
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
        <CardHeader>
          <CardTitle>Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusHistory history={order.statusHistory} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function TrackOrderDetailPage() {
  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-muted/40 via-background to-background">
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#6254f3]" />
          </div>
        }
      >
        <TrackOrderDetailContent />
      </Suspense>
    </div>
  );
}
