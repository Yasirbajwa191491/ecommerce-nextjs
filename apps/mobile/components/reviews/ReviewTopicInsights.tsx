import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { spacing, typography } from "@/constants/theme";
import { useTheme } from "@/providers/theme-context";

type Topic = {
  name: string;
  mentionCount: number;
};

type ReviewTopicInsightsProps = {
  topics?: Topic[];
  status?: "pending" | "complete" | "failed";
};

export function ReviewTopicInsights({ topics, status }: ReviewTopicInsightsProps) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: spacing.md },
        header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        title: { fontSize: typography.sm, fontWeight: "600", color: colors.foreground },
        topics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        skeletonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
      }),
    [colors]
  );

  if (status === "pending") {
    return (
      <View style={styles.container}>
        <Skeleton height={16} width="50%" />
        <View style={styles.skeletonRow}>
          <Skeleton height={28} width={72} borderRadius={999} />
          <Skeleton height={28} width={96} borderRadius={999} />
          <Skeleton height={28} width={64} borderRadius={999} />
        </View>
      </View>
    );
  }

  if (!topics?.length || status === "failed") return null;

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel="Most mentioned review topics">
      <View style={styles.header}>
        <Ionicons name="bar-chart-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.title}>Most Mentioned Topics</Text>
      </View>
      <View style={styles.topics}>
        {topics.map((topic) => (
          <Badge
            key={topic.name}
            label={`${topic.name} (${topic.mentionCount})`}
            variant="default"
          />
        ))}
      </View>
    </View>
  );
}
