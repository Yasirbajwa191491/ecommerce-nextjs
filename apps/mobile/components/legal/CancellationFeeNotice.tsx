import { StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { usePublicSettingsMap } from "@/hooks/useSiteSettings";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import {
  cancellationFeePolicyText,
  cancellationFeeShortLabel,
  parseCancellationRefundFeePercent,
} from "@convex/lib/cancellationFee";

export function CancellationFeeNotice() {
  const { map } = usePublicSettingsMap();
  const styles = useThemedStyles(createCancellationFeeNoticeStyles);
  const feePercent = parseCancellationRefundFeePercent(
    map?.cancellation_refund_fee_percent
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{cancellationFeeShortLabel(feePercent)}</Text>
      <Text style={styles.body}>{cancellationFeePolicyText(feePercent)}</Text>
    </View>
  );
}

function createCancellationFeeNoticeStyles({ colors, textStyles }: ThemeStyleTokens) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.primaryMuted,
      borderRadius: radius.xl,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    title: {
      ...textStyles.body,
      fontWeight: "700",
      fontSize: typography.sm,
      color: colors.foreground,
    },
    body: {
      ...textStyles.body,
      fontSize: typography.sm,
      color: colors.text,
      lineHeight: 20,
    },
  });
}
