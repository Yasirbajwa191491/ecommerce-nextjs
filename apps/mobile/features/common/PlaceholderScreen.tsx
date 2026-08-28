import { ReactNode } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";

import { Card } from "@/components/ui/Card";
import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

type PlaceholderScreenProps = {
  title: string;
  description: string;
  bullets?: string[];
  children?: ReactNode;
};

export function PlaceholderScreen({
  title,
  description,
  bullets,
  children,
}: PlaceholderScreenProps) {
  const styles = useThemedStyles(createPlaceholderScreenStyles);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {bullets && bullets.length > 0 ? (
        <Card>
          {bullets.map((bullet) => (
            <View key={bullet} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </Card>
      ) : null}
      {children}
    </ScrollView>
  );
}

function createPlaceholderScreenStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: typography["2xl"],
      fontWeight: "700" as const,
      color: colors.foreground,
    },
    description: {
      fontSize: typography.base,
      lineHeight: 24,
      color: colors.text,
    },
    bulletRow: {
      flexDirection: "row" as const,
      gap: 8,
      alignItems: "flex-start" as const,
    },
    bulletDot: {
      fontSize: typography.base,
      color: colors.primary,
      lineHeight: 22,
    },
    bulletText: {
      flex: 1,
      fontSize: typography.sm,
      lineHeight: 22,
      color: colors.text,
    },
  });
}
