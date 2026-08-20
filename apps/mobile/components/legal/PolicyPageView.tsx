import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/components/layout/Header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Skeleton } from "@/components/ui/Skeleton";
import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLegalPageContent } from "@/hooks/useLegalPageContent";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import type { PolicySettingKey } from "@/lib/legal-content";

type PolicyVariant = "terms" | "privacy" | "shipping" | "return";

type PolicyPageConfig = {
  settingKey: PolicySettingKey;
  title: string;
  eyebrow: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const POLICY_PAGES: Record<PolicyVariant, PolicyPageConfig> = {
  terms: {
    settingKey: "terms_conditions",
    title: "Terms & Conditions",
    eyebrow: "Legal",
    description:
      "Please read these terms carefully before placing an order. They outline how we process purchases, payments, and order fulfillment.",
    icon: "document-text-outline",
  },
  privacy: {
    settingKey: "privacy_policy",
    title: "Privacy Policy",
    eyebrow: "Your data",
    description:
      "We are committed to protecting your personal information. This policy explains what we collect, how we use it, and your rights.",
    icon: "shield-outline",
  },
  shipping: {
    settingKey: "shipping_policy",
    title: "Shipping Policy",
    eyebrow: "Delivery",
    description:
      "Learn how we calculate shipping costs, when orders ship, and how to track your delivery from checkout to your door.",
    icon: "cube-outline",
  },
  return: {
    settingKey: "return_policy",
    title: "Return Policy",
    eyebrow: "Refunds",
    description:
      "Our return and refund guidelines help you shop with confidence. Review eligibility, timelines, and how to start a return.",
    icon: "refresh-outline",
  },
};

type PolicyPageViewProps = {
  variant: PolicyVariant;
};

export function PolicyPageView({ variant }: PolicyPageViewProps) {
  const config = POLICY_PAGES[variant];
  const insets = useSafeAreaInsets();
  const { horizontalPadding } = useLayoutMetrics();
  const { paragraphs, isLoading } = useLegalPageContent(config.settingKey);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Header title={config.title} showBack showSearch={false} showCart={false} />

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingHorizontal: horizontalPadding,
              paddingBottom: insets.bottom + spacing["2xl"],
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.eyebrowRow}>
              <Ionicons name={config.icon} size={14} color={colors.primary} />
              <Text style={styles.eyebrow}>{config.eyebrow}</Text>
            </View>
            <Text style={styles.heroTitle}>{config.title}</Text>
            <Text style={styles.heroSub}>{config.description}</Text>
          </View>

          <View style={styles.card}>
            {isLoading ? (
              <View style={styles.skeletonWrap}>
                <Skeleton width="100%" height={14} />
                <Skeleton width="92%" height={14} />
                <Skeleton width="88%" height={14} />
                <Skeleton width="95%" height={14} style={{ marginTop: spacing.lg }} />
                <Skeleton width="90%" height={14} />
              </View>
            ) : (
              paragraphs.map((paragraph) => (
                <Text key={paragraph.slice(0, 32)} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))
            )}
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
    paddingTop: spacing.lg,
    gap: spacing["2xl"],
  },
  hero: {
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eyebrow: {
    fontSize: typography.xs,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  heroTitle: {
    ...textStyles.display,
    fontSize: typography["3xl"],
  },
  heroSub: {
    ...textStyles.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing["2xl"],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.md,
  },
  paragraph: {
    ...textStyles.body,
    color: colors.text,
  },
  skeletonWrap: {
    gap: spacing.sm,
  },
});
