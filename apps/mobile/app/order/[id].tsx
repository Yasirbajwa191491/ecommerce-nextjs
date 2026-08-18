import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/features/common/PlaceholderScreen";

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <PlaceholderScreen
      title={id ? `Order ${id}` : "Order details"}
      description="Order detail will use getPublicOrderDetail and trackByOrderNumber from the existing Convex backend."
      bullets={[
        "Order status timeline",
        "Line items and totals",
        "Payment and delivery information",
      ]}
    />
  );
}
