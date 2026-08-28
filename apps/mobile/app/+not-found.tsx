import { Link, Stack } from "expo-router";
import { Text, View, StyleSheet } from "react-native";

import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { useScreenRootStyle } from "@/hooks/useScreenStyles";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

export default function NotFoundScreen() {
  const rootStyle = useScreenRootStyle();
  const styles = useThemedStyles(createNotFoundStyles);

  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={[styles.container, rootStyle]}>
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

function createNotFoundStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      padding: spacing["2xl"],
      gap: spacing.md,
    },
    title: {
      fontSize: typography["2xl"],
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    description: {
      fontSize: typography.base,
      color: colors.muted,
      textAlign: "center" as const,
      maxWidth: 320,
      lineHeight: 24,
    },
  });
}
