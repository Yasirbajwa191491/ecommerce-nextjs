import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionItem = {
  id: string;
  question: string;
  answer: string;
};

type AccordionProps = {
  items: AccordionItem[];
};

export function Accordion({ items }: AccordionProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((current) => (current === id ? null : id));
  };

  return (
    <View style={styles.wrapper}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <View key={item.id} style={styles.item}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={item.question}
              onPress={() => toggle(item.id)}
              style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
            >
              <Text style={styles.question}>{item.question}</Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textSecondary}
              />
            </Pressable>
            {isOpen ? (
              <Animated.View style={styles.answerWrap}>
                <Text style={styles.answer}>{item.answer}</Text>
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    wrapper: {
      gap: spacing.sm,
    },
    item: {
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
      minHeight: 56,
    },
    triggerPressed: {
      backgroundColor: colors.primaryMuted,
    },
    question: {
      ...textStyles.cardTitle,
      flex: 1,
      fontSize: typography.base,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    answerWrap: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      paddingTop: 0,
    },
    answer: {
      ...textStyles.bodySmall,
      color: colors.text,
      lineHeight: 22,
    },
  });
}
