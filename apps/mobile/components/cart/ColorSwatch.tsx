import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "@/constants/theme";
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    alignSelf: "flex-start",
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
    alignItems: "center",
    justifyContent: "center",
  },
  dotInitial: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.surface,
  },
  label: {
    fontSize: typography.xs,
    fontWeight: "500",
    color: colors.foreground,
  },
});
