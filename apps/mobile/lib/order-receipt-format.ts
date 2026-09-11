import { formatCurrencyAmount } from "@ecommerce/shared";

export type OrderReceiptData = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  storeAddress: string;
  orderNumber: string;
  orderDate: number;
  paymentMethodLabel: string;
  paymentStatusLabel: string;
  orderStatusLabel: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    productName: string;
    color: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    isPromotionGift: boolean;
  }>;
  subtotal: number;
  discountTotal: number;
  shipping: number;
  deliveryCharge?: number;
  deliveryMethodLabel?: string;
  deliveryEstimate?: string;
  tax: number;
  total: number;
  currency: string;
  paidAt?: number;
  receiptKind: "final" | "provisional" | "record";
  receiptTitle: string;
  receiptNote?: string;
  promotions: Array<{
    promotionName: string;
    promotionDescription?: string;
    freeQuantity: number;
    savingsAmount: number;
  }>;
};

function formatReceiptDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(amount: number, currency: string): string {
  return formatCurrencyAmount(amount, currency);
}

export function buildReceiptHtml(receipt: OrderReceiptData): string {
  const itemRows = receipt.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}${item.isPromotionGift ? " (Gift)" : ""}<br/><small>${escapeHtml(item.color)}</small></td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${money(item.unitPrice, receipt.currency)}</td>
        <td style="text-align:right">${money(item.lineTotal, receipt.currency)}</td>
      </tr>`
    )
    .join("");

  const promoRows =
    receipt.promotions.length > 0
      ? `<section><h3>Promotions</h3><ul>${receipt.promotions
          .map(
            (promo) =>
              `<li>${escapeHtml(promo.promotionName)} — saved ${money(promo.savingsAmount, receipt.currency)}</li>`
          )
          .join("")}</ul></section>`
      : "";

  const note = receipt.receiptNote
    ? `<p style="color:#b45309;background:#fffbeb;padding:12px;border-radius:8px;">${escapeHtml(receipt.receiptNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(receipt.receiptTitle)} — ${escapeHtml(receipt.orderNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; margin: 24px; }
    h1, h2, h3 { margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 6px; vertical-align: top; }
    th { text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    .totals { margin-top: 16px; max-width: 320px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .total { font-weight: 700; font-size: 18px; border-top: 2px solid #111827; margin-top: 8px; padding-top: 8px; }
    .muted { color: #6b7280; font-size: 14px; }
    section { margin-top: 24px; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(receipt.receiptTitle)}</h1>
    <p class="muted">${escapeHtml(receipt.storeName)}</p>
    <p class="muted">${escapeHtml(receipt.storeAddress)}</p>
    <p class="muted">${escapeHtml(receipt.storeEmail)} · ${escapeHtml(receipt.storePhone)}</p>
  </header>
  ${note}
  <section>
    <h2>Order ${escapeHtml(receipt.orderNumber)}</h2>
    <p class="muted">Placed ${formatReceiptDate(receipt.orderDate)}</p>
    <p>Status: <strong>${escapeHtml(receipt.orderStatusLabel)}</strong></p>
    <p>Payment: <strong>${escapeHtml(receipt.paymentMethodLabel)}</strong> — ${escapeHtml(receipt.paymentStatusLabel)}</p>
    ${receipt.paidAt ? `<p class="muted">Paid ${formatReceiptDate(receipt.paidAt)}</p>` : ""}
  </section>
  <section>
    <h3>Customer</h3>
    <p>${escapeHtml(receipt.customerName)}<br/>${escapeHtml(receipt.customerEmail)}<br/>${escapeHtml(receipt.customerPhone)}</p>
    <p>${escapeHtml(receipt.customerAddress)}</p>
    ${
      receipt.deliveryMethodLabel
        ? `<p class="muted">${escapeHtml(receipt.deliveryMethodLabel)}${receipt.deliveryEstimate ? ` · ${escapeHtml(receipt.deliveryEstimate)}` : ""}</p>`
        : ""
    }
  </section>
  <section>
    <h3>Items</h3>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align:center">Qty</th>
          <th style="text-align:right">Unit</th>
          <th style="text-align:right">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div><span>Subtotal</span><span>${money(receipt.subtotal, receipt.currency)}</span></div>
      ${
        receipt.discountTotal > 0
          ? `<div><span>Discount</span><span>-${money(receipt.discountTotal, receipt.currency)}</span></div>`
          : ""
      }
      <div><span>Shipping</span><span>${money(receipt.shipping, receipt.currency)}</span></div>
      ${
        receipt.deliveryCharge
          ? `<div><span>Delivery</span><span>${money(receipt.deliveryCharge, receipt.currency)}</span></div>`
          : ""
      }
      <div><span>Tax</span><span>${money(receipt.tax, receipt.currency)}</span></div>
      <div class="total"><span>Total</span><span>${money(receipt.total, receipt.currency)}</span></div>
    </div>
  </section>
  ${promoRows}
</body>
</html>`;
}

export function resolveReceiptActionLabels(receipt: OrderReceiptData): {
  downloadLabel: string;
  shareLabel: string;
} {
  if (receipt.receiptKind === "provisional") {
    return {
      downloadLabel: "Download Summary",
      shareLabel: "Share Summary",
    };
  }
  return {
    downloadLabel: "Download Receipt",
    shareLabel: "Share Receipt",
  };
}
