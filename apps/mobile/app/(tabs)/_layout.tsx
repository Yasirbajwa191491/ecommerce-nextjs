import { Tabs, type ErrorBoundaryProps } from "expo-router";

import { GlobalErrorView } from "@/components/feedback/GlobalErrorView";
import { PremiumTabBar } from "@/components/navigation/PremiumTabBar";
import { logAppError } from "@/lib/errors";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logAppError(error, { segment: "tabs" });
  return (
    <GlobalErrorView
      error={error}
      title="Something went wrong"
      onRetry={retry}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="shop" options={{ title: "Shop" }} />
      <Tabs.Screen name="ai" options={{ title: "AI" }} />
      <Tabs.Screen name="orders" options={{ title: "Orders" }} />
      <Tabs.Screen name="cart" options={{ title: "Cart" }} />
    </Tabs>
  );
}
