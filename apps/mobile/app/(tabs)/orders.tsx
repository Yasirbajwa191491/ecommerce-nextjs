import { router } from "expo-router";
import { View } from "react-native";

import { EmptyState } from "@/components/feedback/EmptyState";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/theme";

export default function OrdersScreen() {
  return (
    <ScreenContainer>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Header title="Orders" showSearch={false} />
        <EmptyState
          icon="receipt-outline"
          title="No orders yet"
          description="Your purchases will appear here. Track orders by number and email once checkout is complete."
          actionLabel="Start Shopping"
          onAction={() => router.push("/(tabs)/shop")}
        />
      </View>
    </ScreenContainer>
  );
}
