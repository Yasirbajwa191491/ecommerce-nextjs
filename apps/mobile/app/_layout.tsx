import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { GlobalErrorView } from "@/components/feedback/GlobalErrorView";
import { logAppError } from "@/lib/errors";
import { MobileAppProviders } from "@/providers/MobileAppProviders";
import { useTheme } from "@/providers/theme-context";

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

function RootStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
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
        <Stack.Screen name="wishlist" options={{ headerShown: false }} />
        <Stack.Screen name="promotions" options={{ headerShown: false }} />
        <Stack.Screen name="visual-search" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="order/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="contact" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="shipping" options={{ headerShown: false }} />
        <Stack.Screen name="return" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
      </Stack>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

export default function RootLayout() {
  return (
    <MobileAppProviders>
      <RootStack />
    </MobileAppProviders>
  );
}
