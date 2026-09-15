"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastError, toastSuccess } from "@/lib/app-toast";

type QrCodeCardProps = {
  title: string;
  description?: string;
  url: string;
  status?: string;
  expiresAt?: number;
  amountLabel?: string;
  onRevoke?: () => void;
  onRegenerate?: () => void;
  busy?: boolean;
};

export function QrCodeCard({
  title,
  description,
  url,
  status,
  expiresAt,
  amountLabel,
  onRevoke,
  onRegenerate,
  busy,
}: QrCodeCardProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 280,
      color: { dark: "#111827", light: "#ffffff" },
    }).then((value) => {
      if (!cancelled) setDataUrl(value);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      toastSuccess("QR link copied");
    } catch (error) {
      toastError(error, { fallback: "Could not copy link" });
    }
  }

  function downloadPng() {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${title.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    link.click();
  }

  function printQr() {
    const popup = window.open("", "_blank", "noopener,noreferrer,width=480,height=640");
    if (!popup) return;
    popup.document.write(
      `<html><head><title>${title}</title></head><body style="font-family:sans-serif;text-align:center;padding:24px"><h1>${title}</h1><img src="${dataUrl}" width="280" height="280" alt="" /><p>${url}</p></body></html>`
    );
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {status ? <Badge variant="secondary">{status}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`${title} QR code`}
            className="mx-auto size-44 rounded-lg border bg-white p-2"
          />
        ) : (
          <div className="mx-auto size-44 animate-pulse rounded-lg bg-muted" />
        )}
        {amountLabel ? <p className="text-sm font-medium">{amountLabel}</p> : null}
        {expiresAt ? (
          <p className="text-xs text-muted-foreground">
            Expires {new Date(expiresAt).toLocaleString()}
          </p>
        ) : null}
        <p className="break-all text-xs text-muted-foreground">{url}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void copyLink()}>
            Copy link
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPng} disabled={!dataUrl}>
            Download PNG
          </Button>
          <Button size="sm" variant="outline" onClick={printQr} disabled={!dataUrl}>
            Print
          </Button>
          {onRegenerate ? (
            <Button size="sm" variant="outline" onClick={onRegenerate} disabled={busy}>
              Regenerate
            </Button>
          ) : null}
          {onRevoke ? (
            <Button size="sm" variant="destructive" onClick={onRevoke} disabled={busy}>
              Revoke
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
