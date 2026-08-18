import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { colors, spacing, typography } from "@/constants/theme";
import { getFriendlyErrorMessage } from "@/lib/errors";

type ErrorStateProps = {
  title?: string;
  message?: string;
  error?: unknown;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Something went wrong",
  message,
  error,
  onRetry,
}: ErrorStateProps) {
  const displayMessage =
    message ??
    (error
      ? getFriendlyErrorMessage(error)
      : "We couldn't load this content. Please check your connection and try again.");
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.destructive} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry ? (
        <Button label="Try again" variant="outline" onPress={onRetry} accessibilityLabel="Try again" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
    gap: spacing.md,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: typography.lg,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: typography.sm,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 320,
  },
});
