import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { GlobalErrorView } from "@/components/feedback/GlobalErrorView";
import { colors } from "@/constants/theme";
import { logAppError } from "@/lib/errors";
import { MobileAppProviders } from "@/providers/MobileAppProviders";

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logAppError(error, { segment: "route" });

  return (
    <GlobalErrorView
      error={error}
      title="Something went wrong"
      onRetry={retry}
    />
  );
}

export default function RootLayout() {
  return (
    <MobileAppProviders>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="visual-search" options={{ title: "Visual Search" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="order/[id]" options={{ title: "Order Details" }} />
        <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
      </Stack>
      <StatusBar style="auto" />
    </MobileAppProviders>
  );
}
