import { formatCurrencyAmount } from "@ecommerce/shared";
import { useQuery } from "convex/react";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadges";
import { Button } from "@/components/ui/Button";
import { radius, spacing, typography } from "@/constants/theme";
import { api } from "@/lib/convex-api";
import { forgetRecentOrder, loadRecentOrders, type RecentOrder } from "@/lib/recent-orders";
import { useTheme } from "@/providers/theme-context";

function RecentOrderRow({ saved, onForget }: { saved: RecentOrder; onForget: () => void }) {
  const { colors } = useTheme();
  const result = useQuery(api.orders.getOrderByNumber, { orderNumber: saved.orderNumber, customerEmail: saved.email, accessToken: saved.accessToken });
  const order = result?.order;
  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View order ${saved.orderNumber}`} style={styles.order}
      onPress={() => router.push({ pathname: "/order/[id]", params: { id: saved.orderNumber, orderNumber: saved.orderNumber, customerEmail: saved.email, accessToken: saved.accessToken } })}>
      <View style={styles.description}>
        <Text style={[styles.number, { color: colors.foreground }]} numberOfLines={2}>{saved.orderNumber}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{order ? formatCurrencyAmount(order.total, order.currency) : result === null ? "Open or look up this order" : "Loading order status…"}</Text>
      </View>
      {order ? <OrderStatusBadge status={order.status} /> : null}
    </Pressable>
    <Button label="Remove from this device" variant="ghost" size="sm" onPress={onForget} accessibilityLabel={`Remove order ${saved.orderNumber} from recent orders on this device`} />
  </View>;
}

export function RecentOrdersSection() {
  const { colors } = useTheme();
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    void loadRecentOrders().then((records) => { if (active) setOrders(records); });
    return () => { active = false; };
  }, []));
  if (!orders.length) return null;
  return <View style={styles.section}>
    <Text style={[styles.heading, { color: colors.foreground }]}>Your recent orders</Text>
    <Text style={[styles.meta, { color: colors.textSecondary }]}>Purchases saved securely on this device.</Text>
    {orders.map((saved) => <RecentOrderRow key={saved.orderNumber} saved={saved} onForget={() => {
      void forgetRecentOrder(saved.orderNumber).then(() => loadRecentOrders()).then(setOrders);
    }} />)}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm }, heading: { fontSize: typography.lg, fontWeight: "700" },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.xs },
  order: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: spacing.md },
  description: { flex: 1, gap: spacing.xs }, number: { fontSize: typography.sm, fontWeight: "700" }, meta: { fontSize: typography.sm, lineHeight: 20 },
});
