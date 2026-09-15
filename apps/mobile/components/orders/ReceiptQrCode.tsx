import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { buildQrMatrix } from "@/lib/order-receipt-qr";

type ReceiptQrCodeProps = {
  value: string;
  size?: number;
};

export function ReceiptQrCode({ value, size = 200 }: ReceiptQrCodeProps) {
  const matrix = useMemo(() => buildQrMatrix(value), [value]);
  const quietZone = Math.max(10, Math.round(size * 0.1));
  const inner = size - quietZone * 2;
  const cellSize = inner / matrix.size;

  return (
    <View
      style={[styles.container, { width: size, height: size, padding: quietZone }]}
      accessibilityLabel="Secure order tracking QR code"
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
