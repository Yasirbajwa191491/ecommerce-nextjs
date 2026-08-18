import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { MobileConvexProvider } from "@/providers/MobileConvexProvider";

export default function RootLayout() {
  return (
    <MobileConvexProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </MobileConvexProvider>
  );
}
