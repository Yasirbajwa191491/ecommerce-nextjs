"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { OrderDeliveredReviews } from "@/components/reviews/order-delivered-reviews";
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
import { OrderDeliverySummary } from "@/components/orders/order-delivery-summary";
import { OrderItemPricing } from "@/components/orders/order-item-pricing";
import { OrderPromotionsSummary } from "@/components/orders/order-promotions-summary";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { SHOP_BADGE, SHOP_BODY, SHOP_BODY_SM, SHOP_META_LABEL, SHOP_PAGE_TITLE, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";

const PRIMARY_BUTTON_CLASS =
  "h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white";

function TrackOrderDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const orderNumber = decodeURIComponent(params.orderNumber as string);
  const highlightProductId = searchParams.get("review") ?? undefined;

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
      <div className={cn("mx-auto max-w-lg text-center", CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
        <h1 className={SHOP_PAGE_TITLE}>Order not found</h1>
        <p className={cn("mt-2", SHOP_BODY)}>
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
    <div className={cn("mx-auto max-w-4xl space-y-6", CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
      <Button
        variant="ghost"
        render={<Link href="/track-order" />}
        className="rounded-full px-0 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tracking
      </Button>

      <div>
        <p className={SHOP_META_LABEL}>Order tracking</p>
        <h1 className={cn("mt-1", SHOP_PAGE_TITLE)}>{order.orderNumber}</h1>
        <p className={cn("mt-2", SHOP_BODY)}>
          Placed on{" "}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          }).format(new Date(order.createdAt))}
        </p>
      </div>

      <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
        <CardHeader>
          <CardTitle className={SHOP_SUBSECTION_TITLE}>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderProgressTimeline status={order.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
          <CardHeader>
            <CardTitle className={SHOP_SUBSECTION_TITLE}>Customer information</CardTitle>
          </CardHeader>
          <CardContent className={cn("space-y-2", SHOP_BODY)}>
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
            <CardTitle className={SHOP_SUBSECTION_TITLE}>Payment information</CardTitle>
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
          <CardTitle className={SHOP_SUBSECTION_TITLE}>Ordered products</CardTitle>
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
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {item.productName}
                  {item.isPromotionGift ? (
                    <Badge variant="secondary" className={SHOP_BADGE}>
                      Promotion gift
                    </Badge>
                  ) : null}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ColorSwatch color={item.color} />
                  <span>Qty {item.quantity}</span>
                  {item.sku ? <span>SKU {item.sku}</span> : null}
                  {item.size ? <span>Size {item.size}</span> : null}
                </div>
                {item.warrantySummary ? (
                  <p className={cn("mt-1", SHOP_BODY_SM)}>
                    Warranty: {item.warrantySummary}
                  </p>
                ) : null}
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
          <OrderPromotionsSummary
            promotions={order.promotions ?? []}
            currency={order.currency}
            className="mt-2"
          />
          <OrderDeliverySummary
            deliveryMethod={order.deliveryMethod}
            deliveryMethodLabel={order.deliveryMethodLabel}
            deliveryEstimate={order.deliveryEstimate}
            deliveryCharge={order.deliveryCharge}
            shipping={order.shipping}
            currency={order.currency}
            className="mt-4"
          />
          <OrderSummaryBreakdown
            subtotal={order.subtotal}
            discountTotal={order.discountTotal}
            shipping={order.shipping}
            deliveryCharge={order.deliveryCharge}
            deliveryMethod={order.deliveryMethod}
            deliveryMethodLabel={order.deliveryMethodLabel}
            tax={order.tax}
            total={order.total}
            currency={order.currency}
            showProductsLabel
            className="mt-2"
          />
        </CardContent>
      </Card>

      {order.status === "delivered" ? (
        <OrderDeliveredReviews
          orderNumber={order.orderNumber}
          customerEmail={order.customerEmail}
          items={order.items}
          highlightProductId={highlightProductId}
        />
      ) : null}

      <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
        <CardHeader>
          <CardTitle className={SHOP_SUBSECTION_TITLE}>Status history</CardTitle>
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
