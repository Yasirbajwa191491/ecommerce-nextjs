import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/constants/theme";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.description}>
          The screen you are looking for does not exist or has been moved.
        </Text>
        <Link href="/" asChild>
          <Button label="Go to Home" accessibilityLabel="Go to home screen" />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  description: {
    fontSize: typography.base,
    color: colors.muted,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 24,
  },
});
