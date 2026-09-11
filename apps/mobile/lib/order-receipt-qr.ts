import { buildReceiptTrackUrl } from "@/lib/order-receipt-url";

type QrMatrix = {
  size: number;
  get: (row: number, col: number) => boolean;
};

// Core QR encoder only — avoids canvas-based renderers that break in React Native.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const qrCore = require("qrcode/lib/core/qrcode") as {
  create: (
    data: string,
    options?: { errorCorrectionLevel?: string }
  ) => { modules: { size: number; get: (row: number, col: number) => boolean } };
};

/** Pure-JS QR matrix for React Native (no canvas). */
export function buildReceiptQrMatrix(orderNumber: string): QrMatrix {
  const trackUrl = buildReceiptTrackUrl(orderNumber);
  const encoded = qrCore.create(trackUrl, { errorCorrectionLevel: "M" });
  const { modules } = encoded;

  return {
    size: modules.size,
    get: (row, col) => Boolean(modules.get(row, col)),
  };
}
