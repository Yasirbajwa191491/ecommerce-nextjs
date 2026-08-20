import { StyleSheet, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import {
  formatOrderLabel,
  getOrderStatusBadgeVariant,
  getPaymentMethodLabel,
  getPaymentStatusBadgeVariant,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/order-display";
import { spacing } from "@/constants/theme";

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      label={formatOrderLabel(status)}
      variant={getOrderStatusBadgeVariant(status)}
    />
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge
      label={formatOrderLabel(status)}
      variant={getPaymentStatusBadgeVariant(status)}
    />
  );
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge label={getPaymentMethodLabel(method)} variant="default" />;
}

export function OrderStatusBadgeRow({
  status,
  paymentStatus,
  paymentMethod,
}: {
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
}) {
  return (
    <View style={styles.row}>
      <OrderStatusBadge status={status} />
      <PaymentMethodBadge method={paymentMethod} />
      <PaymentStatusBadge status={paymentStatus} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
});
