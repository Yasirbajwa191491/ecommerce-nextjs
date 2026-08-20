import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

const LINKS = [
  {
    title: "About us",
    description: "Our story, how we work, and FAQs",
    icon: "information-circle-outline" as const,
    route: "/about" as const,
  },
  {
    title: "Contact",
    description: "Get help with orders, products, and support",
    icon: "mail-outline" as const,
    route: "/contact" as const,
  },
];

export function StoreLinksSection() {
  const { horizontalPadding } = useLayoutMetrics();

  return (
    <View style={[styles.wrap, { paddingHorizontal: horizontalPadding }]}>
      <Text style={styles.heading}>Store</Text>
      <View style={styles.list}>
        {LINKS.map((link) => (
          <Pressable
            key={link.route}
            accessibilityRole="button"
            accessibilityLabel={link.title}
            onPress={() => router.push(link.route)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={link.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{link.title}</Text>
              <Text style={styles.description}>{link.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  heading: {
    ...textStyles.sectionTitle,
    fontSize: typography.xl,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 76,
  },
  cardPressed: {
    backgroundColor: colors.primaryMuted,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: typography.base,
    fontWeight: "600",
    color: colors.foreground,
  },
  description: {
    fontSize: typography.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
