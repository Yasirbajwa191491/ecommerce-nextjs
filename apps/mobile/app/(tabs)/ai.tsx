import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Header } from "@/components/layout/Header";
import { Chip } from "@/components/ui/Chip";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

const PROMPTS = [
  "Find me a comfortable office chair under $200",
  "Show me trending electronics",
  "Help me choose a gift",
  "What's on sale right now?",
];

export default function AiScreen() {
  const { productId, productName } = useLocalSearchParams<{
    productId?: string;
    productName?: string;
  }>();
  const { horizontalPadding } = useLayoutMetrics();

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title="AI Shopping" showSearch={false} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: horizontalPadding },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Tell me what you&apos;re looking for</Text>
            <Text style={styles.heroSub}>
              {productName
                ? `Ask anything about "${productName}" — I'm ready to help.`
                : "Get personalized recommendations and shopping advice powered by AI."}
            </Text>
          </View>

          {productId ? (
            <View style={styles.contextCard}>
              <Ionicons name="cube-outline" size={18} color={colors.primary} />
              <Text style={styles.contextText} numberOfLines={2}>
                Product context: {productName ?? productId}
              </Text>
            </View>
          ) : null}

          <Text style={styles.promptLabel}>Try asking</Text>
          <View style={styles.prompts}>
            {PROMPTS.map((prompt) => (
              <Chip
                key={prompt}
                label={prompt}
                onPress={() => router.push({ pathname: "/search", params: { q: prompt } })}
                style={styles.promptChip}
              />
            ))}
          </View>

          <View style={styles.comingSoon}>
            <Ionicons name="chatbubbles-outline" size={24} color={colors.muted} />
            <Text style={styles.comingSoonTitle}>Full chat experience coming soon</Text>
            <Text style={styles.comingSoonSub}>
              Voice and conversational shopping will connect to the existing server-side AI — no keys in the app.
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing["4xl"],
    gap: spacing["2xl"],
  },
  hero: {
    alignItems: "center",
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...textStyles.display,
    fontSize: typography["2xl"],
    textAlign: "center",
  },
  heroSub: {
    fontSize: typography.base,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  contextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  contextText: {
    flex: 1,
    fontSize: typography.sm,
    color: colors.foreground,
    fontWeight: "500",
  },
  promptLabel: {
    ...textStyles.sectionTitle,
    fontSize: typography.base,
  },
  prompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  promptChip: {
    maxWidth: "100%",
  },
  comingSoon: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing["2xl"],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginTop: spacing.lg,
  },
  comingSoonTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  comingSoonSub: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
