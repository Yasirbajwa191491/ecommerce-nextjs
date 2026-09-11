import { formatCurrencyAmount } from "@ecommerce/shared";
import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ReceiptQrCode } from "@/components/orders/ReceiptQrCode";
import type { OrderReceiptData } from "@/lib/order-receipt-format";

const RECEIPT_WIDTH = 380;

type OrderReceiptImageProps = {
  receipt: OrderReceiptData;
};

function formatReceiptDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function money(amount: number, currency: string): string {
  return formatCurrencyAmount(amount, currency);
}

export const OrderReceiptImage = forwardRef<View, OrderReceiptImageProps>(
  function OrderReceiptImage({ receipt }, ref) {
    const isProvisional = receipt.receiptKind === "provisional";

    return (
      <View ref={ref} style={styles.root} collapsable={false}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.storeName}>{receipt.storeName}</Text>
              <Text style={styles.receiptTitle}>{receipt.receiptTitle}</Text>
            </View>
            <View style={[styles.badge, isProvisional ? styles.badgeWarning : styles.badgeSuccess]}>
              <Text style={[styles.badgeText, isProvisional ? styles.badgeTextWarning : styles.badgeTextSuccess]}>
                {receipt.orderStatusLabel}
              </Text>
            </View>
          </View>

          {receipt.receiptNote ? (
            <View style={styles.noteBanner}>
              <Text style={styles.noteText}>{receipt.receiptNote}</Text>
            </View>
          ) : null}

          <View style={styles.orderMeta}>
            <Text style={styles.orderLabel}>Order number</Text>
            <Text style={styles.orderNumber}>{receipt.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatReceiptDate(receipt.orderDate)}</Text>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text style={styles.metaValue}>{receipt.paymentMethodLabel}</Text>
              <Text style={styles.metaSub}>{receipt.paymentStatusLabel}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Customer</Text>
              <Text style={styles.metaValue}>{receipt.customerName}</Text>
              <Text style={styles.metaSub}>{receipt.customerPhone}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            {receipt.items.map((item, index) => (
              <View key={`${item.productName}-${index}`} style={styles.lineRow}>
                <View style={styles.lineInfo}>
                  <Text style={styles.lineName} numberOfLines={2}>
                    {item.productName}
                    {item.isPromotionGift ? " (Gift)" : ""}
                  </Text>
                  <Text style={styles.lineMeta}>
                    {item.color} · Qty {item.quantity}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>{money(item.lineTotal, receipt.currency)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{money(receipt.subtotal, receipt.currency)}</Text>
            </View>
            {receipt.discountTotal > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount</Text>
                <Text style={[styles.totalValue, styles.discount]}>
                  -{money(receipt.discountTotal, receipt.currency)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Shipping</Text>
              <Text style={styles.totalValue}>{money(receipt.shipping, receipt.currency)}</Text>
            </View>
            {receipt.deliveryCharge ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Delivery</Text>
                <Text style={styles.totalValue}>
                  {money(receipt.deliveryCharge, receipt.currency)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>{money(receipt.tax, receipt.currency)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>{money(receipt.total, receipt.currency)}</Text>
            </View>
          </View>

          <View style={styles.deliveryBlock}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <Text style={styles.deliveryText}>{receipt.customerAddress}</Text>
            {receipt.deliveryMethodLabel ? (
              <Text style={styles.deliverySub}>
                {receipt.deliveryMethodLabel}
                {receipt.deliveryEstimate ? ` · ${receipt.deliveryEstimate}` : ""}
              </Text>
            ) : null}
          </View>

          <View style={styles.footer}>
            <View style={styles.qrBlock}>
              <ReceiptQrCode orderNumber={receipt.orderNumber} size={96} />
              <Text style={styles.qrCaption}>Scan to track order</Text>
            </View>
            <View style={styles.footerInfo}>
              <Text style={styles.footerStore}>{receipt.storeName}</Text>
              <Text style={styles.footerLine}>{receipt.storeAddress}</Text>
              <Text style={styles.footerLine}>{receipt.storeEmail}</Text>
              <Text style={styles.footerLine}>{receipt.storePhone}</Text>
              {receipt.paidAt ? (
                <Text style={styles.footerPaid}>Paid {formatReceiptDate(receipt.paidAt)}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  root: {
    width: RECEIPT_WIDTH,
    backgroundColor: "#ffffff",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  storeName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.3,
  },
  receiptTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6254f3",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeSuccess: {
    backgroundColor: "#ecfdf5",
  },
  badgeWarning: {
    backgroundColor: "#fffbeb",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextSuccess: {
    color: "#047857",
  },
  badgeTextWarning: {
    color: "#b45309",
  },
  noteBanner: {
    backgroundColor: "#fffbeb",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  noteText: {
    fontSize: 12,
    color: "#92400e",
    lineHeight: 18,
  },
  orderMeta: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  orderLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.4,
  },
  orderDate: {
    fontSize: 13,
    color: "#6b7280",
  },
  metaGrid: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    overflow: "hidden",
  },
  metaCell: {
    flex: 1,
    padding: 14,
    gap: 2,
  },
  metaDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  metaSub: {
    fontSize: 12,
    color: "#6b7280",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  lineRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  lineInfo: {
    flex: 1,
    gap: 2,
  },
  lineName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  lineMeta: {
    fontSize: 12,
    color: "#6b7280",
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  totals: {
    backgroundColor: "#f9fafb",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 13,
    color: "#6b7280",
  },
  totalValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  discount: {
    color: "#047857",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: "#111827",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6254f3",
  },
  deliveryBlock: {
    gap: 6,
  },
  deliveryText: {
    fontSize: 13,
    color: "#111827",
    lineHeight: 20,
  },
  deliverySub: {
    fontSize: 12,
    color: "#6b7280",
  },
  footer: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  qrBlock: {
    alignItems: "center",
    gap: 6,
  },
  qrCaption: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  footerInfo: {
    flex: 1,
    gap: 2,
  },
  footerStore: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  footerLine: {
    fontSize: 11,
    color: "#6b7280",
    lineHeight: 16,
  },
  footerPaid: {
    fontSize: 11,
    fontWeight: "600",
    color: "#047857",
    marginTop: 4,
  },
});

export const ORDER_RECEIPT_CAPTURE_WIDTH = RECEIPT_WIDTH;
