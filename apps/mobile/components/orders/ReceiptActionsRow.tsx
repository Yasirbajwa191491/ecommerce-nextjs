import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { radius, spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";

type ReceiptActionsRowProps = {
  downloadLabel: string;
  shareLabel: string;
  loading: "download" | "share" | null;
  disabled?: boolean;
  onDownload: () => void;
  onShare: () => void;
};

export function ReceiptActionsRow({
  downloadLabel,
  shareLabel,
  loading,
  disabled = false,
  onDownload,
  onShare,
}: ReceiptActionsRowProps) {
  const styles = useThemedStyles(createReceiptActionsRowStyles);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={downloadLabel}
        accessibilityState={{ disabled: disabled || loading !== null, busy: loading === "download" }}
        disabled={disabled || loading !== null}
        onPress={onDownload}
        style={({ pressed }) => [
          styles.action,
          styles.actionLeft,
          pressed && styles.actionPressed,
          (disabled || loading !== null) && styles.actionDisabled,
        ]}
      >
        {loading === "download" ? (
          <ActivityIndicator size="small" color={styles.iconColor.color} />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name="download-outline" size={22} color={styles.iconColor.color} />
          </View>
        )}
        <Text style={styles.actionTitle}>Download</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>
          {downloadLabel.replace(/^Download\s?/i, "") || "Receipt"}
        </Text>
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={shareLabel}
        accessibilityState={{ disabled: disabled || loading !== null, busy: loading === "share" }}
        disabled={disabled || loading !== null}
        onPress={onShare}
        style={({ pressed }) => [
          styles.action,
          styles.actionRight,
          pressed && styles.actionPressed,
          (disabled || loading !== null) && styles.actionDisabled,
        ]}
      >
        {loading === "share" ? (
          <ActivityIndicator size="small" color={styles.iconColor.color} />
        ) : (
          <View style={styles.iconWrap}>
            <Ionicons name="share-outline" size={22} color={styles.iconColor.color} />
          </View>
        )}
        <Text style={styles.actionTitle}>Share</Text>
        <Text style={styles.actionSubtitle} numberOfLines={1}>
          {shareLabel.replace(/^Share\s?/i, "") || "Receipt"}
        </Text>
      </Pressable>
    </View>
  );
}

function createReceiptActionsRowStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    container: {
      flexDirection: "row",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radius.lg,
      overflow: "hidden",
      backgroundColor: colors.surface,
    },
    action: {
      flex: 1,
      minHeight: 96,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.xs,
    },
    actionLeft: {},
    actionRight: {},
    actionPressed: {
      backgroundColor: colors.primaryMuted,
    },
    actionDisabled: {
      opacity: 0.55,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primaryMuted,
    },
    iconColor: {
      color: colors.primary,
    },
    actionTitle: {
      fontSize: typography.sm,
      fontWeight: "700",
      color: colors.foreground,
    },
    actionSubtitle: {
      fontSize: typography.xs,
      color: colors.textSecondary,
      textAlign: "center",
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.md,
    },
  });
}
