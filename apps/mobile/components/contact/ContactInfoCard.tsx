import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Skeleton } from "@/components/ui/Skeleton";
import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/theme-context";

type ContactInfoCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  lines: string[];
  href?: string;
  onPress?: () => void;
};

export function ContactInfoCard({ icon, title, lines, href, onPress }: ContactInfoCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createContactInfoCardStyles);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (href) {
      void Linking.openURL(href);
    }
  };

  const isTappable = Boolean(href || onPress);

  const content = (
    <>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {lines.map((line) => (
          <Text
            key={line}
            style={[styles.line, isTappable && styles.lineTappable]}
            numberOfLines={3}
          >
            {line}
          </Text>
        ))}
      </View>
      {isTappable ? (
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      ) : null}
    </>
  );

  if (isTappable) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${lines.join(", ")}`}
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

export function ContactInfoSkeleton() {
  const styles = useThemedStyles(createContactInfoCardStyles);

  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} borderRadius={radius.md} />
      <View style={styles.textWrap}>
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={16} />
      </View>
    </View>
  );
}

function createContactInfoCardStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    card: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      minHeight: 88,
    },
    cardPressed: {
      backgroundColor: colors.primaryMuted,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.primaryMuted,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    textWrap: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      ...textStyles.cardTitle,
      fontSize: typography.base,
      fontWeight: "600" as const,
      color: colors.foreground,
    },
    line: {
      ...textStyles.body,
      fontSize: typography.sm,
      color: colors.text,
    },
    lineTappable: {
      color: colors.primary,
    },
  });
}
