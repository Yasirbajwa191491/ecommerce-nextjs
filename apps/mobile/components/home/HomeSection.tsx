import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { spacing } from "@/constants/theme";
import { useLayoutMetrics } from "@/hooks/useLayoutMetrics";

type HomeSectionProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  accent?: boolean;
  compact?: boolean;
};

export function HomeSection({
  title,
  subtitle,
  children,
  actionLabel,
  onAction,
  accent = false,
  compact = false,
}: HomeSectionProps) {
  const { horizontalPadding } = useLayoutMetrics();

  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={{ paddingHorizontal: horizontalPadding }}>
        <SectionHeader
          title={title}
          subtitle={subtitle}
          actionLabel={actionLabel}
          onAction={onAction}
          accent={accent}
        />
      </View>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  compact: {
    paddingTop: spacing.lg,
  },
  content: {},
});
