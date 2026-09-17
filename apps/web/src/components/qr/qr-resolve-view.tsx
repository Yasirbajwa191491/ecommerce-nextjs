"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderProgressTimeline } from "@/components/orders/order-progress-timeline";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrencyAmount } from "@/lib/currencies";
import { toastError, toastSuccess } from "@/lib/app-toast";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/types/order";
import { Loader2 } from "lucide-react";

type QrResolveViewProps = {
  type: string;
  token: string;
  source?: "web" | "admin";
};

type PublicOrderSnapshot = {
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  total: number;
  currency: string;
  items: Array<{ productName: string; quantity: number; color: string }>;
};

type ResolveResult = {
  ok: boolean;
  code: string;
  message: string;
  type?: string;
  productId?: string;
  productName?: string;
  orderNumber?: string;
  orderId?: Id<"orders">;
  amount?: number;
  currency?: string;
  status?: OrderStatus;
  paymentStatus?: string;
  customerName?: string;
  customerAddress?: string;
  items?: Array<{ productName: string; quantity: number; color: string }>;
  actions?: Array<{ id: string; label: string; nextStatus: OrderStatus }>;
  order?: PublicOrderSnapshot;
};

function OrderTrackingFromQr({ token, initial }: { token: string; initial: PublicOrderSnapshot }) {
  const live = useQuery(api.qr.watchOrderFromQr, { token });
  const order =
    live?.ok && live.order
      ? (live.order as PublicOrderSnapshot)
      : initial;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const appLink = `ecommerce://qr/order/${encodeURIComponent(token)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Order Tracking
        </p>
        <h1 className="mt-1 text-3xl font-semibold">{order.orderNumber}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Status updates live while this page stays open.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order progress</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderProgressTimeline status={order.status} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <PaymentStatusBadge status={order.paymentStatus} />
            <PaymentMethodBadge method={order.paymentMethod} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </p>
            <p className="text-xl font-semibold">
              {formatCurrencyAmount(order.total, order.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {order.items.map((item) => (
              <li
                key={`${item.productName}-${item.color}`}
                className="flex justify-between gap-4 border-b border-border/60 py-2 last:border-0"
              >
                <span>
                  {item.productName}
                  {item.color ? (
                    <span className="text-muted-foreground"> · {item.color}</span>
                  ) : null}
                </span>
                <span className="text-muted-foreground">Qty {item.quantity}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open in the mobile app</CardTitle>
          <CardDescription>
            Phone camera opens this web page (HTTPS). Use the in-app scanner, or open the app
            link below when the store app / Expo Go is installed.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button render={<a href={appLink} />}>Open in app</Button>
          <Button variant="outline" render={<Link href="/track-order" />}>
            Track another order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function QrResolveView({ type, token, source = "web" }: QrResolveViewProps) {
  const resolveQr = useAction(api.qr.resolve);
  const startPayment = useAction(api.stripe.startPaymentFromQr);
  const updateOrderStatus = useMutation(api.adminOrders.updateOrderStatus);
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = (await resolveQr({
        tokenOrUrl: `/qr/${type}/${token}`,
        source,
        platform: "web",
      })) as ResolveResult;
      setResult(payload);
      if (payload.ok && payload.type === "product" && payload.productId) {
        window.location.replace(`/product/${payload.productId}`);
      }
    } catch {
      setResult({
        ok: false,
        code: "invalid",
        message: "This QR code is not valid.",
      });
    } finally {
      setLoading(false);
    }
  }, [resolveQr, source, token, type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function pay() {
    setBusy(true);
    try {
      const payment = await startPayment({
        tokenOrUrl: `/qr/payment/${token}`,
        platform: "web",
      });
      if (payment.alreadyPaid) {
        toastSuccess("This order has already been paid.");
        window.location.assign(`/track-order/${encodeURIComponent(payment.orderNumber)}`);
        return;
      }
      if (!payment.checkoutUrl) {
        throw new Error("Payment could not be started.");
      }
      window.location.assign(payment.checkoutUrl);
    } catch (error) {
      toastError(error, { fallback: "Payment could not be started." });
    } finally {
      setBusy(false);
    }
  }

  async function applyStaffAction(nextStatus: OrderStatus) {
    if (!result?.orderId) return;
    setBusy(true);
    try {
      await updateOrderStatus({ orderId: result.orderId, status: nextStatus });
      toastSuccess("Order updated");
      await load();
    } catch (error) {
      toastError(error, { fallback: "Could not update this order." });
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#6254f3]" />
      </div>
    );
  }

  if (!result?.ok) {
    const signIn =
      result?.code === "unauthorized"
        ? `/admin/login?redirect=${encodeURIComponent(`/qr/${type}/${token}`)}`
        : null;
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>QR unavailable</CardTitle>
          <CardDescription>{result?.message ?? "This QR code is not valid."}</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {signIn ? (
            <Button render={<Link href={signIn} />}>Sign in</Button>
          ) : (
            <Button render={<Link href="/track-order" />}>Track an order</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (result.type === "payment") {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Pay order {result.orderNumber}</CardTitle>
          <CardDescription>
            The QR code only identifies this payment. Stripe confirms the charge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.amount != null && result.currency ? (
            <p className="text-2xl font-semibold">
              {formatCurrencyAmount(result.amount, result.currency)}
            </p>
          ) : null}
          <Button onClick={() => void pay()} disabled={busy}>
            {busy ? "Opening checkout…" : "Continue to payment"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (result.type === "order" && result.order) {
    return <OrderTrackingFromQr token={token} initial={result.order} />;
  }

  if ((result.type === "package" || result.type === "delivery") && result.orderNumber) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>{result.orderNumber}</CardTitle>
          <CardDescription>
            {result.status} · {result.paymentStatus}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            <span className="text-muted-foreground">Customer: </span>
            {result.customerName}
          </p>
          <p>
            <span className="text-muted-foreground">Address: </span>
            {result.customerAddress}
          </p>
          <ul className="space-y-1 text-sm">
            {result.items?.map((item) => (
              <li key={`${item.productName}-${item.color}`}>
                {item.productName} · {item.color} · Qty {item.quantity}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {result.actions?.map((action) => (
              <Button
                key={action.id}
                variant="outline"
                disabled={busy}
                onClick={() => void applyStaffAction(action.nextStatus)}
              >
                {action.label}
              </Button>
            ))}
            {result.orderId ? (
              <Button variant="outline" render={<Link href={`/admin/orders/${result.orderId}`} />}>
                Open order
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader>
        <CardTitle>QR resolved</CardTitle>
        <CardDescription>{result.message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
