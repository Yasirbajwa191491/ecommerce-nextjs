import { StyleSheet, View } from "react-native";

import { useTheme } from "@/providers/theme-context";

/**
 * Solid privacy cover for the OS app switcher / recent-apps preview.
 * Shown while App Lock is enabled and the app leaves the foreground,
 * before timeout-based locking (lock UI uses a native Modal).
 *
 * Platform note: iOS may still briefly snapshot the previous frame before
 * JS can paint this overlay. Android coverage is generally more reliable.
 */
export function AppLockPrivacyOverlay() {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.overlay, { backgroundColor: colors.background }]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
});
