import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import {
  buildReceiptHtml,
  type OrderReceiptData,
} from "@/lib/order-receipt-format";

export type { OrderReceiptData } from "@/lib/order-receipt-format";
export { buildReceiptHtml, resolveReceiptActionLabels } from "@/lib/order-receipt-format";

function sanitizeFileName(orderNumber: string): string {
  return orderNumber.replace(/[^a-zA-Z0-9-_]/g, "_");
}

export async function writeReceiptFile(receipt: OrderReceiptData): Promise<File> {
  const html = buildReceiptHtml(receipt);
  const file = new File(Paths.cache, `receipt-${sanitizeFileName(receipt.orderNumber)}.html`);
  file.create({ overwrite: true, intermediates: true });
  file.write(html);
  return file;
}

export async function shareReceiptFile(receipt: OrderReceiptData): Promise<void> {
  const file = await writeReceiptFile(receipt);
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/html",
    dialogTitle: receipt.receiptTitle,
    UTI: "public.html",
  });
}
