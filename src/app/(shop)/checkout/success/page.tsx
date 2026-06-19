"use client";

import { useEffect, useMemo, useRef, Suspense } from "react";
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
import { ColorSwatch } from "@/components/cart/cart-product-display";
import { OrderSummaryBreakdown } from "@/components/orders/order-summary-breakdown";
import { OrderDeliverySummary } from "@/components/orders/order-delivery-summary";
import { OrderItemPricing } from "@/components/orders/order-item-pricing";
import { OrderPromotionsSummary } from "@/components/orders/order-promotions-summary";
import { normalizeOrderItemLike } from "@/lib/order-item-display";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCartContext } from "@/context/cart_context";
import { CONTENT_SECTION_PADDING_Y, PAGE_GUTTER } from "@/lib/layout-constants";
import { SHOP_BODY, SHOP_BODY_SM, SHOP_PAGE_TITLE, SHOP_SUBSECTION_TITLE } from "@/lib/typography";
import { cn } from "@/lib/utils";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const { clearCart } = useCartContext();

  const clearedCartRef = useRef(false);

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
  const publicSettings = useQuery(api.settings.listPublic);

  const smsNotificationsEnabled =
    publicSettings?.sms_order_confirmation_enabled === "true";

  useEffect(() => {
    if (!orderData?.order || clearedCartRef.current) return;
    clearedCartRef.current = true;
    clearCart();
    sessionStorage.removeItem("lastOrderNumber");
    sessionStorage.removeItem("lastOrderEmail");
  }, [orderData?.order, clearCart]);

  const isLoading = orderNumber && orderData === undefined;
  const order = orderData?.order;
  const items = orderData?.items ?? [];
  const promotions = orderData?.promotions ?? [];

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
      <div className={cn("mx-auto max-w-lg text-center", CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
        <h1 className={SHOP_PAGE_TITLE}>Order not found</h1>
        <p className={cn("mt-2", SHOP_BODY)}>
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
      <section className={cn("mx-auto w-full max-w-3xl", CONTENT_SECTION_PADDING_Y)} style={PAGE_GUTTER}>
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin text-[#6254f3]" />
            <p className={SHOP_BODY}>Loading your order…</p>
          </div>
        ) : !order ? (
          <div className="text-center">
            <h1 className={SHOP_PAGE_TITLE}>Order not found</h1>
            <p className={cn("mt-2", SHOP_BODY)}>
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
                <CardTitle className={SHOP_PAGE_TITLE}>
                  {order.paymentMethod === "stripe" &&
                  order.paymentStatus === "pending"
                    ? "Payment processing"
                    : "Order confirmed!"}
                </CardTitle>
                <CardDescription className={cn("mt-2", SHOP_BODY)}>
                  {statusMessage}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 py-8 sm:px-8">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className={SHOP_BODY_SM}>Order number</p>
                <p className="mt-1 text-lg font-bold tracking-wide text-foreground">
                  {order.orderNumber}
                </p>
              </div>

              <div className="space-y-3">
                <h2 className={cn("flex items-center gap-2", SHOP_SUBSECTION_TITLE)}>
                  <Package className="size-4" />
                  Items ordered
                </h2>
                <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
                  {items.map((item: Doc<"orderItems">) => {
                    const normalized = normalizeOrderItemLike(item);
                    return (
                      <li
                        key={item._id}
                        className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                            {item.productName} × {item.quantity}
                            {item.isPromotionGift ? (
                              <Badge variant="secondary" className={SHOP_BODY_SM}>
                                Promotion gift
                              </Badge>
                            ) : null}
                          </p>
                          <div className="mt-1.5">
                            <ColorSwatch color={item.color} />
                          </div>
                          <div className="mt-2">
                            <OrderItemPricing
                              item={{
                                ...normalized,
                                productName: item.productName,
                                color: item.color,
                                quantity: item.quantity,
                                lineTotal: item.lineTotal,
                                imageUrl: item.imageUrl,
                                unitPrice: normalized.finalUnitPrice,
                              }}
                              currency={order.currency}
                            />
                          </div>
                          {item.warrantySummary ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Warranty: {item.warrantySummary}
                            </p>
                          ) : null}
                        </div>
                        <span className="font-semibold tabular-nums">
                          <FormatPrice
                            price={item.lineTotal}
                            currency={order.currency}
                          />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <OrderPromotionsSummary
                promotions={promotions.map((promo) => ({
                  promotionName: promo.promotionName,
                  promotionDescription: promo.promotionDescription,
                  freeQuantity: promo.freeQuantity,
                  savingsAmount: promo.savingsAmount,
                }))}
                currency={order.currency}
              />

              <OrderDeliverySummary
                deliveryMethod={order.deliveryMethod}
                deliveryMethodLabel={order.deliveryMethodLabel}
                deliveryEstimate={order.deliveryEstimate}
                deliveryCharge={order.deliveryCharge}
                shipping={order.shipping}
                currency={order.currency}
              />

              <OrderSummaryBreakdown
                subtotal={order.subtotal}
                discountTotal={order.discountTotal ?? 0}
                shipping={order.shipping}
                deliveryCharge={order.deliveryCharge ?? 0}
                deliveryMethod={order.deliveryMethod}
                deliveryMethodLabel={order.deliveryMethodLabel}
                tax={order.tax}
                total={order.total}
                currency={order.currency}
                showProductsLabel
              />

              <div className="flex w-full flex-col items-center gap-3">
                <Button
                  render={<Link href="/products" />}
                  className="group h-11 gap-2 rounded-full bg-[#6254f3] px-8 text-sm font-semibold !text-white shadow-md shadow-[#6254f3]/25 transition-all hover:bg-[#5548e0] hover:!text-white hover:shadow-lg active:scale-[0.98] [&_svg]:!text-white"
                >
                  <ShoppingBag className="size-4" />
                  Continue shopping
                </Button>
                <Button
                  render={<Link href="/contact" />}
                  variant="ghost"
                  className="h-10 gap-2 rounded-full px-6 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  Contact support
                </Button>
              </div>

              <p
                className={cn(
                  "text-center",
                  SHOP_BODY_SM,
                  order.paymentMethod === "stripe" &&
                    order.paymentStatus === "pending" &&
                    "animate-pulse"
                )}
              >
                {smsNotificationsEnabled ? (
                  <>
                    A confirmation email will be sent to {order.customerEmail}.
                    A text message will be sent to {order.customerPhone}.
                  </>
                ) : (
                  <>A confirmation email will be sent to {order.customerEmail}.</>
                )}
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
