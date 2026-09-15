"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { QrCodeCard } from "@/components/qr/qr-code-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";
import { useState } from "react";

type AdminQrCard = {
  qrId: Id<"qrCodes">;
  type: string;
  url: string;
  status: string;
  expiresAt?: number;
};

type ProductQrPanelProps = {
  productId: Id<"products">;
};

export function ProductQrPanel({ productId }: ProductQrPanelProps) {
  const codes = useQuery(api.qr.listForProduct, { productId }) as AdminQrCard[] | undefined;
  const createProductQr = useMutation(api.qr.createProductQr);
  const revoke = useMutation(api.qr.revoke);
  const regenerate = useMutation(api.qr.regenerate);
  const [busy, setBusy] = useState(false);

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
        <CardTitle>Product QR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => createProductQr({ productId }), "Product QR ready")}
        >
          Generate QR
        </Button>
        {(codes ?? []).map((code) => (
          <QrCodeCard
            key={code.qrId}
            title="Product QR"
            description="Customers can scan this to open the product page."
            url={code.url}
            status={code.status}
            busy={busy}
            onRevoke={() => void run(() => revoke({ qrId: code.qrId }), "QR revoked")}
            onRegenerate={() => void run(() => regenerate({ qrId: code.qrId }), "QR regenerated")}
          />
        ))}
      </CardContent>
    </Card>
  );
}
