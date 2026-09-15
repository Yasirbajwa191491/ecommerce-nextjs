"use client";

import { useCallback, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { AdminQrScanner } from "@/components/qr/admin-qr-scanner";
import { QrResolveView } from "@/components/qr/qr-resolve-view";
import { parseQrPayload } from "@convex/lib/qrTokens";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminScanPage() {
  const [parsed, setParsed] = useState<{ type: string; token: string } | null>(null);
  const [invalid, setInvalid] = useState(false);

  const onDetect = useCallback((value: string) => {
    const next = parseQrPayload(value);
    if (!next) {
      setInvalid(true);
      setParsed(null);
      return;
    }
    setInvalid(false);
    setParsed(next);
  }, []);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scan QR"
        description="Warehouse and delivery staff can scan package, delivery, order, and payment codes here."
      />
      <Card>
        <CardContent className="pt-6">
          <AdminQrScanner onDetect={onDetect} />
          {invalid ? (
            <p className="mt-3 text-sm text-destructive">This QR code is not a store code.</p>
          ) : null}
        </CardContent>
      </Card>
      {parsed ? <QrResolveView type={parsed.type} token={parsed.token} source="admin" /> : null}
    </div>
  );
}
