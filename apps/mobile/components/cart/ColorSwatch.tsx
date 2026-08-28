import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import {
  formatColorLabel,
  resolveSwatchBackground,
} from "@/lib/color-swatch";

export { isHexColor } from "@/lib/color-swatch";

type ColorSwatchProps = {
  color: string;
  showLabel?: boolean;
  label?: string;
  style?: ViewStyle;
};

export function ColorSwatch({
  color,
  showLabel = true,
  label,
  style,
}: ColorSwatchProps) {
  const styles = useThemedStyles(createColorSwatchStyles);
  const swatchBackground = resolveSwatchBackground(color);
  const displayLabel = label ?? formatColorLabel(color);

  const dot = (
    <View
      style={[
        styles.dot,
        swatchBackground ? { backgroundColor: swatchBackground } : styles.namedDot,
      ]}
    >
      {!swatchBackground ? (
        <Text style={styles.dotInitial} numberOfLines={1}>
          {displayLabel.charAt(0).toUpperCase()}
        </Text>
      ) : null}
    </View>
  );

  if (!showLabel) {
    return <View style={style}>{dot}</View>;
  }

  return (
    <View style={[styles.wrap, style]}>
      {dot}
      <Text style={styles.label}>{displayLabel}</Text>
    </View>
  );
}

function createColorSwatchStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.sm,
      alignSelf: "flex-start" as const,
      backgroundColor: colors.borderLight,
      borderRadius: radius.full,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    dot: {
      width: 16,
      height: 16,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.8)",
    },
    namedDot: {
      backgroundColor: colors.mutedForeground,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    dotInitial: {
      fontSize: 9,
      fontWeight: "700" as const,
      color: colors.surface,
    },
    label: {
      fontSize: typography.xs,
      fontWeight: "500" as const,
      color: colors.foreground,
    },
  });
}
