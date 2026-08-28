import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type AboutSectionHeaderProps = {
  badge: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function AboutSectionHeader({
  badge,
  badgeIcon,
  title,
  description,
  align = "left",
}: AboutSectionHeaderProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const centered = align === "center";

  return (
    <View style={[styles.wrap, centered && styles.wrapCenter]}>
      <View style={[styles.badge, centered && styles.badgeCenter]}>
        <Ionicons name={badgeIcon} size={14} color={colors.primary} />
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
      <Text style={[styles.title, centered && styles.titleCenter]}>{title}</Text>
      {description ? (
        <Text style={[styles.description, centered && styles.descriptionCenter]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    wrapCenter: {
      alignItems: "center" as const,
    },
    badge: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      alignSelf: "flex-start" as const,
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.full,
      backgroundColor: colors.primaryMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primarySubtle,
    },
    badgeCenter: {
      alignSelf: "center" as const,
    },
    badgeText: {
      fontSize: typography.xs,
      fontWeight: "700" as const,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
      color: colors.primary,
    },
    title: {
      ...textStyles.sectionTitle,
      fontSize: typography["2xl"],
      lineHeight: 30,
      color: colors.foreground,
    },
    titleCenter: {
      textAlign: "center" as const,
    },
    description: {
      ...textStyles.body,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    descriptionCenter: {
      textAlign: "center" as const,
    },
  });
}
