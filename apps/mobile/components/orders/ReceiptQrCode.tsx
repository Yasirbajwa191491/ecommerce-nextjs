import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildReceiptQrMatrix } from "@/lib/order-receipt-qr";

type ReceiptQrCodeProps = {
  orderNumber: string;
  size?: number;
};

export function ReceiptQrCode({ orderNumber, size = 96 }: ReceiptQrCodeProps) {
  const matrix = useMemo(() => buildReceiptQrMatrix(orderNumber), [orderNumber]);
  const cellSize = size / matrix.size;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityLabel="Order tracking QR code"
    >
      {Array.from({ length: matrix.size }, (_, row) => (
        <View key={`qr-row-${row}`} style={styles.row}>
          {Array.from({ length: matrix.size }, (_, col) => (
            <View
              key={`qr-cell-${row}-${col}`}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: matrix.get(row, col) ? "#111827" : "#ffffff",
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
  },
});
