"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import {
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { ColorSwatch } from "@/components/cart/cart-product-display";
import {
  OrderProgressTimeline,
  OrderStatusHistory,
} from "@/components/orders/order-progress-timeline";
import { OrderDeliverySummary } from "@/components/orders/order-delivery-summary";
import { OrderItemPricing } from "@/components/orders/order-item-pricing";
import { OrderPromotionsSummary } from "@/components/orders/order-promotions-summary";
import { OrderSummaryBreakdown } from "@/components/orders/order-summary-breakdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";
import {
  SHOP_BADGE,
  SHOP_BODY,
  SHOP_BODY_SM,
  SHOP_META_LABEL,
  SHOP_PAGE_TITLE,
  SHOP_SUBSECTION_TITLE,
} from "@/lib/typography";
import { cn } from "@/lib/utils";
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PublicOrderItem,
  PublicOrderPromotion,
} from "@/types/order";
import { Check, Copy, Share2 } from "lucide-react";
import { formatCurrencyAmount } from "@/lib/currencies";

export type PublicOrderTrackingOrder = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  subtotal: number;
  tax: number;
  discountTotal: number;
  shipping: number;
  deliveryCharge?: number;
  deliveryMethod?: string;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  currency: string;
  createdAt: number;
  paidAt?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: PublicOrderItem[];
  promotions: PublicOrderPromotion[];
  statusHistory: Array<{
    event: string;
    description: string;
    previousStatus?: OrderStatus;
    newStatus?: OrderStatus;
    createdAt: number;
  }>;
  verified?: boolean;
  accessToken?: string;
};

type PublicOrderTrackingPanelProps = {
  order: PublicOrderTrackingOrder;
  shareUrl?: string;
  className?: string;
  showOpenInApp?: boolean;
  appDeepLink?: string;
};

export function PublicOrderTrackingPanel({
  order,
  shareUrl,
  className,
  showOpenInApp = false,
  appDeepLink,
}: PublicOrderTrackingPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toastSuccess("Tracking link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError(null, { fallback: "Could not copy the link." });
    }
  }, [shareUrl]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    const payload = {
      title: `Order ${order.orderNumber}`,
      text: `Track order ${order.orderNumber}`,
      url: shareUrl,
    };
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        return;
      }
      await handleCopyLink();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toastError(error, { fallback: "Could not share this order." });
    }
  }, [handleCopyLink, order.orderNumber, shareUrl]);

  return (
    <div className={cn("mx-auto max-w-4xl space-y-6", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className={SHOP_META_LABEL}>Order tracking</p>
          <h1 className={cn("mt-1 break-all", SHOP_PAGE_TITLE)}>{order.orderNumber}</h1>
          <p className={cn("mt-2", SHOP_BODY)}>
            Placed on{" "}
            {new Intl.DateTimeFormat(undefined, {
              dateStyle: "long",
              timeStyle: "short",
            }).format(new Date(order.createdAt))}
          </p>
          <p className={cn("mt-1", SHOP_BODY_SM)}>
            Status updates live while this page stays open.
          </p>
        </div>
        {shareUrl ? (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void handleShare()}
            >
              <Share2 className="size-4" />
              Share
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => void handleCopyLink()}
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        ) : null}
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
              key={`${item.productId}-${item.color}-${index}`}
              className="flex gap-4 border-b pb-4 last:border-b-0 last:pb-0"
            >
              {item.imageUrl ? (
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border sm:size-20">
                  <Image
                    src={item.imageUrl}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>
              ) : (
                <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border bg-muted text-xs text-muted-foreground sm:size-20">
                  No image
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {item.productName}
                  {item.isPromotionGift ? (
                    <Badge variant="secondary" className={SHOP_BADGE}>
                      Promotion gift
                    </Badge>
                  ) : null}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {item.color ? <ColorSwatch color={item.color} /> : null}
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

      {order.statusHistory?.length ? (
        <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
          <CardHeader>
            <CardTitle className={SHOP_SUBSECTION_TITLE}>Status history</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderStatusHistory history={order.statusHistory} />
          </CardContent>
        </Card>
      ) : null}

      {showOpenInApp && appDeepLink ? (
        <Card className="rounded-2xl border-border/60 shadow-lg ring-1 ring-black/[0.03]">
          <CardHeader>
            <CardTitle className={SHOP_SUBSECTION_TITLE}>Open in the mobile app</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <p className={cn("flex-1", SHOP_BODY_SM)}>
              Phone camera opens this web page. Use the in-app scanner, or open the app
              link when the store app / Expo Go is installed.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button render={<a href={appDeepLink} />} className="rounded-full">
                Open in app
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                render={<Link href="/track-order" />}
              >
                Track another order
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
