import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radius, spacing, textStyles, typography } from "@/constants/theme";

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

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  wrapCenter: {
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(98, 84, 243, 0.15)",
  },
  badgeCenter: {
    alignSelf: "center",
  },
  badgeText: {
    fontSize: typography.xs,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.primary,
  },
  title: {
    ...textStyles.sectionTitle,
    fontSize: typography["2xl"],
    lineHeight: 30,
  },
  titleCenter: {
    textAlign: "center",
  },
  description: {
    ...textStyles.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  descriptionCenter: {
    textAlign: "center",
  },
});
