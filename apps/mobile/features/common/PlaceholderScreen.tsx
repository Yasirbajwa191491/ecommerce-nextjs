import { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { colors, spacing, typography } from "@/constants/theme";

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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: typography["2xl"],
    fontWeight: "700",
    color: colors.foreground,
  },
  description: {
    fontSize: typography.base,
    lineHeight: 24,
    color: colors.text,
  },
  bulletRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
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
