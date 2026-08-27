import { Stack } from "expo-router";

import { useTheme } from "@/providers/theme-context";

export default function CheckoutLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="success" />
      <Stack.Screen name="cancel" />
    </Stack>
  );
}
