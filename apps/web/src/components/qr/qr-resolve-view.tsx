"use client";

import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  PublicOrderTrackingPanel,
  type PublicOrderTrackingOrder,
} from "@/components/orders/public-order-tracking-panel";
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
import type { OrderStatus } from "@/types/order";
import { Loader2 } from "lucide-react";

type QrResolveViewProps = {
  type: string;
  token: string;
  source?: "web" | "admin";
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
  order?: PublicOrderTrackingOrder;
};

function OrderTrackingFromQr({
  token,
  initial,
}: {
  token: string;
  initial: PublicOrderTrackingOrder;
}) {
  const live = useQuery(api.qr.watchOrderFromQr, { token });
  const order =
    live?.ok && live.order
      ? (live.order as PublicOrderTrackingOrder)
      : initial;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/qr/order/${encodeURIComponent(token)}`;
  }, [token]);

  const appDeepLink = `ecommerce://qr/order/${encodeURIComponent(token)}`;

  return (
    <PublicOrderTrackingPanel
      order={order}
      shareUrl={shareUrl}
      showOpenInApp
      appDeepLink={appDeepLink}
    />
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
      <Card className="mx-auto max-w-lg rounded-2xl border-border/60 shadow-lg">
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
      <Card className="mx-auto max-w-lg rounded-2xl border-border/60 shadow-lg">
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
          <Button onClick={() => void pay()} disabled={busy} className="rounded-full">
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
      <Card className="mx-auto max-w-2xl rounded-2xl border-border/60 shadow-lg">
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
                className="rounded-full"
                disabled={busy}
                onClick={() => void applyStaffAction(action.nextStatus)}
              >
                {action.label}
              </Button>
            ))}
            {result.orderId ? (
              <Button
                variant="outline"
                className="rounded-full"
                render={<Link href={`/admin/orders/${result.orderId}`} />}
              >
                Open order
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg rounded-2xl border-border/60 shadow-lg">
      <CardHeader>
        <CardTitle>QR resolved</CardTitle>
        <CardDescription>{result.message}</CardDescription>
      </CardHeader>
    </Card>
  );
}
