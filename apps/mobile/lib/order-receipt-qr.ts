import QRCode from "qrcode";

import { buildReceiptTrackUrl } from "@/lib/order-receipt-url";

/** High-resolution QR PNG as a data URL for receipt capture. */
export async function generateReceiptQrDataUrl(orderNumber: string): Promise<string> {
  const trackUrl = buildReceiptTrackUrl(orderNumber);
  return QRCode.toDataURL(trackUrl, {
    width: 192,
    margin: 1,
    color: {
      dark: "#111827",
      light: "#ffffff",
    },
  });
}
