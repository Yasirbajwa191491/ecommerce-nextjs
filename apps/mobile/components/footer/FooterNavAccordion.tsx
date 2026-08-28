import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

import { radius, spacing, touchTarget, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";
import type { FooterLink } from "@/lib/footer-links";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FooterNavAccordionProps = {
  groups: readonly {
    id: string;
    title: string;
    links: readonly FooterLink[];
  }[];
};

function FooterNavGroup({
  title,
  links,
  isOpen,
  onToggle,
}: {
  title: string;
  links: readonly FooterLink[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createFooterNavAccordionStyles);

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${title} links`}
        onPress={onToggle}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
      >
        <Text style={styles.groupTitle}>{title}</Text>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textSecondary}
        />
      </Pressable>
      {isOpen ? (
        <View style={styles.links}>
          {links.map((link) => (
            <Pressable
              key={`${link.label}-${String(link.href)}`}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              onPress={() => router.push(link.href as Href)}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function FooterNavAccordion({ groups }: FooterNavAccordionProps) {
  const styles = useThemedStyles(createFooterNavAccordionStyles);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <View style={styles.wrapper}>
      {groups.map((group) => (
        <FooterNavGroup
          key={group.id}
          title={group.title}
          links={group.links}
          isOpen={openId === group.id}
          onToggle={() => toggle(group.id)}
        />
      ))}
    </View>
  );
}

function createFooterNavAccordionStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden" as const,
    },
    trigger: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.lg,
      minHeight: touchTarget + 8,
    },
    triggerPressed: {
      backgroundColor: colors.primaryMuted,
    },
    groupTitle: {
      ...textStyles.cardTitle,
      flex: 1,
      fontSize: typography.base,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    links: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    linkRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md + 2,
      minHeight: touchTarget,
    },
    linkPressed: {
      backgroundColor: colors.primaryMuted,
    },
    linkLabel: {
      flex: 1,
      fontSize: typography.base,
      color: colors.text,
    },
  });
}
