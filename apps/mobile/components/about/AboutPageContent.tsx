import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AboutImage } from "@/components/about/AboutImage";
import { AboutSectionHeader } from "@/components/about/AboutSectionHeader";
import { Accordion } from "@/components/ui/Accordion";
import { Button } from "@/components/ui/Button";
import {
  ABOUT_CTA,
  ABOUT_HERO,
  ABOUT_STORY,
  FAQ_ITEMS,
  HOW_IT_WORKS_STEPS,
  WHY_SHOP_FEATURES,
} from "@/lib/about-content";
import { radius, spacing, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

export function AboutPageContent() {
  const { colors } = useTheme();
  const styles = useThemedStyles(createAboutStyles);
  const insets = useSafeAreaInsets();
  const { horizontalPadding, contentWidth } = useLayoutMetrics();
  const featureColumnWidth = (contentWidth - horizontalPadding * 2 - spacing.sm) / 2;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing["2xl"] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.heroSection, { paddingHorizontal: horizontalPadding }]}>
        <AboutSectionHeader
          badge={ABOUT_HERO.badge}
          badgeIcon="information-circle-outline"
          title={ABOUT_HERO.title}
          description={ABOUT_HERO.description}
        />
        <AboutImage
          src={ABOUT_HERO.image.src}
          alt={ABOUT_HERO.image.alt}
          aspectRatio={16 / 10}
          priority
          style={styles.heroImage}
        />
        <View style={styles.heroActions}>
          <Button
            label="Start Shopping"
            fullWidth
            onPress={() => router.push("/(tabs)/shop")}
          />
          <Button
            label="Contact us"
            variant="outline"
            fullWidth
            onPress={() => router.push("/contact")}
          />
        </View>
      </View>

      {/* Our Story */}
      <View style={styles.storySection}>
        <View style={{ paddingHorizontal: horizontalPadding, gap: spacing.lg }}>
          <AboutSectionHeader
            badge="Our Story"
            badgeIcon="book-outline"
            title={ABOUT_STORY.title}
            description={ABOUT_STORY.subtitle}
          />
          <AboutImage
            src={ABOUT_STORY.image.src}
            alt={ABOUT_STORY.image.alt}
            aspectRatio={4 / 3}
          />
          <View style={styles.storyCopy}>
            {ABOUT_STORY.paragraphs.map((paragraph) => (
              <Text key={paragraph.slice(0, 32)} style={styles.storyParagraph}>
                {paragraph}
              </Text>
            ))}
          </View>
          <View style={styles.highlights}>
            {ABOUT_STORY.highlights.map((item) => (
              <View key={item} style={styles.highlightRow}>
                <View style={styles.highlightIcon}>
                  <Ionicons name="sparkles" size={16} color={colors.primary} />
                </View>
                <Text style={styles.highlightText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Why Shop With Us */}
      <View style={[styles.surfaceSection, { paddingHorizontal: horizontalPadding }]}>
        <AboutSectionHeader
          badge="Why Us"
          badgeIcon="sparkles-outline"
          title="Why Shop With Us"
          description="Everything you need for a confident, hassle-free online shopping experience."
          align="center"
        />
        <View style={styles.featureGrid}>
          {WHY_SHOP_FEATURES.map((feature) => (
            <View
              key={feature.title}
              style={[styles.featureTile, { width: featureColumnWidth }]}
            >
              <View style={styles.featureIconCircle}>
                <Ionicons name={feature.icon} size={22} color={colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDesc}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* How It Works */}
      <View style={styles.stepsSection}>
        <View style={{ paddingHorizontal: horizontalPadding, gap: spacing.lg }}>
          <AboutSectionHeader
            badge="How It Works"
            badgeIcon="git-network-outline"
            title="How Our Store Works"
            description="From browsing to delivery — your complete shopping journey in six simple steps."
            align="center"
          />
          <View style={styles.stepsList}>
            {HOW_IT_WORKS_STEPS.map((step) => (
              <View key={step.step} style={styles.stepCard}>
                <View style={styles.stepTop}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{step.step}</Text>
                  </View>
                  <View style={styles.stepIconWrap}>
                    <Ionicons name={step.icon} size={18} color={colors.primary} />
                  </View>
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.description}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* FAQ */}
      <View style={[styles.surfaceSection, { paddingHorizontal: horizontalPadding }]}>
        <AboutSectionHeader
          badge="FAQ"
          badgeIcon="help-circle-outline"
          title="Frequently Asked Questions"
          description="Quick answers to common questions about shopping with us."
          align="center"
        />
        <Accordion
          items={FAQ_ITEMS.map((item, index) => ({
            id: String(index),
            question: item.question,
            answer: item.answer,
          }))}
        />
      </View>

      {/* CTA */}
      <View style={[styles.ctaWrap, { paddingHorizontal: horizontalPadding }]}>
        <View style={styles.ctaCard}>
          <View style={styles.ctaGlow} />
          <Text style={styles.ctaTitle}>{ABOUT_CTA.title}</Text>
          <Text style={styles.ctaBody}>{ABOUT_CTA.description}</Text>
          <View style={styles.ctaActions}>
            <Button
              label="Shop products"
              fullWidth
              onPress={() => router.push("/(tabs)/shop")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Contact us"
              onPress={() => router.push("/contact")}
              style={({ pressed }) => [styles.ctaSecondaryBtn, pressed && styles.ctaSecondaryPressed]}
            >
              <Text style={styles.ctaSecondaryText}>Contact us</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function createAboutStyles({ colors, textStyles, shadows }: ThemeStyleTokens) {
  return StyleSheet.create({
  heroSection: {
    paddingTop: spacing.lg,
    paddingBottom: spacing["2xl"],
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  heroImage: {
    marginTop: spacing.xs,
  },
  heroActions: {
    gap: spacing.sm,
  },
  storySection: {
    paddingVertical: spacing["2xl"],
    backgroundColor: colors.background,
  },
  storyCopy: {
    gap: spacing.md,
  },
  storyParagraph: {
    ...textStyles.body,
    color: colors.text,
    lineHeight: 24,
  },
  highlights: {
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  highlightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  highlightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  highlightText: {
    flex: 1,
    fontSize: typography.sm,
    fontWeight: "500",
    color: colors.foreground,
    lineHeight: 22,
  },
  surfaceSection: {
    paddingVertical: spacing["2xl"],
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  featureTile: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 148,
  },
  featureIconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: typography.sm,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
  featureDesc: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  stepsSection: {
    paddingVertical: spacing["2xl"],
    backgroundColor: colors.background,
  },
  stepsList: {
    gap: spacing.sm,
  },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.sm,
  },
  stepTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    fontSize: typography.xs,
    fontWeight: "700",
    color: colors.primaryForeground,
  },
  stepIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  stepDesc: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  ctaWrap: {
    paddingTop: spacing.lg,
  },
  ctaCard: {
    borderRadius: radius.xl,
    padding: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: colors.navy,
    overflow: "hidden",
    alignItems: "center",
    ...shadows.md,
  },
  ctaGlow: {
    position: "absolute",
    top: -40,
    left: -20,
    width: 200,
    height: 200,
    borderRadius: radius.full,
    backgroundColor: "rgba(98, 84, 243, 0.35)",
  },
  ctaTitle: {
    ...textStyles.sectionTitle,
    fontSize: typography["2xl"],
    color: colors.primaryForeground,
    textAlign: "center",
  },
  ctaBody: {
    ...textStyles.body,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 24,
  },
  ctaActions: {
    width: "100%",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ctaSecondaryBtn: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  ctaSecondaryPressed: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  ctaSecondaryText: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.primaryForeground,
  },
  });
}
