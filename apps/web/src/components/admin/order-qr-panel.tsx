"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { QrCodeCard } from "@/components/qr/qr-code-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { formatCurrencyAmount } from "@/lib/currencies";
import { useState } from "react";

type AdminQrCard = {
  qrId: Id<"qrCodes">;
  type: string;
  url: string;
  status: string;
  expiresAt?: number;
  amount?: number;
  currency?: string;
};

type OrderQrPanelProps = {
  orderId: Id<"orders">;
  paymentMethod?: string;
  paymentStatus?: string;
  total?: number;
  currency?: string;
};

export function OrderQrPanel({
  orderId,
  paymentMethod,
  paymentStatus,
  total,
  currency,
}: OrderQrPanelProps) {
  const codes = useQuery(api.qr.listForOrder, { orderId }) as AdminQrCard[] | undefined;
  const createOrderQr = useMutation(api.qr.createOrderQr);
  const createPackageQr = useMutation(api.qr.createPackageQr);
  const createDeliveryQr = useMutation(api.qr.createDeliveryQr);
  const createPaymentQr = useMutation(api.qr.createPaymentQr);
  const revoke = useMutation(api.qr.revoke);
  const regenerate = useMutation(api.qr.regenerate);
  const [busy, setBusy] = useState(false);

  const canPaymentQr = paymentMethod === "stripe" && paymentStatus === "pending";

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await action();
      toastSuccess(success);
    } catch (error) {
      toastError(error, { fallback: "Could not update QR code." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR codes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => createOrderQr({ orderId }), "Order QR ready")}
          >
            Generate order QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => createPackageQr({ orderId }), "Package QR ready")}
          >
            Generate package QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => createDeliveryQr({ orderId }), "Delivery QR ready")}
          >
            Generate delivery QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy || !canPaymentQr}
            onClick={() => void run(() => createPaymentQr({ orderId }), "Payment QR ready")}
          >
            Generate payment QR
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(codes ?? []).map((code) => (
            <QrCodeCard
              key={code.qrId}
              title={`${code.type} QR`}
              url={code.url}
              status={code.status}
              expiresAt={code.expiresAt}
              amountLabel={
                code.amount != null && (code.currency || currency)
                  ? formatCurrencyAmount(code.amount, code.currency ?? currency ?? "USD")
                  : total != null && currency && code.type === "payment"
                    ? formatCurrencyAmount(total, currency)
                    : undefined
              }
              busy={busy}
              onRevoke={() => void run(() => revoke({ qrId: code.qrId }), "QR revoked")}
              onRegenerate={() => void run(() => regenerate({ qrId: code.qrId }), "QR regenerated")}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
