import { useMemo } from "react";
import { StyleSheet } from "react-native";

import {
  createShadows,
  createTextStyles,
  type ColorPalette,
} from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

export type ThemeStyleTokens = {
  colors: ColorPalette;
  textStyles: ReturnType<typeof createTextStyles>;
  shadows: ReturnType<typeof createShadows>;
};

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (theme: ThemeStyleTokens) => T
): T {
  const { colors, textStyles, shadows } = useTheme();
  return useMemo(
    () => factory({ colors, textStyles, shadows }),
    [colors, textStyles, shadows, factory]
  );
}
