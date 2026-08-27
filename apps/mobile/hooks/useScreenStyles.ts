import { useMemo } from "react";
import { StyleSheet, ViewStyle } from "react-native";

import { useTheme } from "@/providers/theme-context";

/** Root screen container style with theme-aware background. */
export function useScreenRootStyle(): ViewStyle {
  const { colors } = useTheme();
  return useMemo(() => ({ flex: 1, backgroundColor: colors.background }), [colors]);
}

/** Common screen stylesheet factory with theme colors. */
export function useScreenStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: ReturnType<typeof useTheme>["colors"]) => T
): T {
  const { colors } = useTheme();
  return useMemo(() => StyleSheet.create(factory(colors)), [colors, factory]);
}
