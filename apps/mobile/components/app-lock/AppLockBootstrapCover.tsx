import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useTheme } from "@/providers/theme-context";

/**
 * Neutral cover while SecureStore config is loading.
 * Must not look like App Lock — most launches have App Lock disabled.
 */
export function AppLockBootstrapCover() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.root, { backgroundColor: colors.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
