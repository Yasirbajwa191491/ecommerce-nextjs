import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type ReviewAiSummaryProps = {
  summary?: string;
  status?: "pending" | "complete" | "failed";
};

export function ReviewAiSummary({ summary, status }: ReviewAiSummaryProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        cardAccent: {
          gap: spacing.sm,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.primarySubtle,
          backgroundColor: colors.primaryMuted,
        },
        header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        headerText: { fontSize: typography.sm, fontWeight: "600", color: colors.primary },
        body: { fontSize: typography.sm, color: colors.foreground, lineHeight: 22 },
      }),
    [colors]
  );

  if (status === "pending") {
    return (
      <View style={styles.card}>
        <Skeleton height={16} width="40%" />
        <Skeleton height={48} />
      </View>
    );
  }

  if (!summary || status === "failed") return null;

  return (
    <View style={styles.cardAccent} accessibilityRole="text" accessibilityLabel="AI review summary">
      <View style={styles.header}>
        <Ionicons name="sparkles" size={16} color={colors.primary} />
        <Text style={styles.headerText}>AI Review Summary</Text>
      </View>
      <Text style={styles.body}>{summary}</Text>
    </View>
  );
}
