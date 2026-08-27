import { ReactNode, useMemo } from "react";
import { StyleSheet, Text, View, ViewProps } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type CardProps = ViewProps & {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function Card({ children, title, subtitle, style, ...props }: CardProps) {
  const { colors, shadows } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          gap: spacing.sm,
          ...shadows.card,
        },
        title: {
          fontSize: typography.lg,
          fontWeight: "700",
          color: colors.foreground,
        },
        subtitle: {
          fontSize: typography.sm,
          color: colors.muted,
        },
      }),
    [colors, shadows]
  );

  return (
    <View style={[styles.card, style]} {...props}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );
}
