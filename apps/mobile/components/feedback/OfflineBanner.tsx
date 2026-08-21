import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing, typography } from "@/constants/theme";
import { isSnapshotOnline, subscribeNetwork } from "@/lib/network";
import { useNetworkStatus } from "@/providers/NetworkProvider";

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const { isOnline, isOffline, justReconnected } = useNetworkStatus();
  const [dismissedOffline, setDismissedOffline] = useState(false);

  useEffect(() => {
    return subscribeNetwork((snapshot) => {
      if (!isSnapshotOnline(snapshot)) {
        setDismissedOffline(false);
      }
    });
  }, []);

  const showOffline = isOffline && !dismissedOffline;
  const showOnline = justReconnected && isOnline;

  if (!showOffline && !showOnline) return null;

  const isOfflineBanner = showOffline && !showOnline;

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: insets.top + spacing.xs },
        isOfflineBanner ? styles.offline : styles.online,
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={
        isOfflineBanner
          ? "You're offline. Some information may be from your last visit."
          : "Back online."
      }
    >
      <Ionicons
        name={isOfflineBanner ? "cloud-offline-outline" : "cloud-done-outline"}
        size={16}
        color={isOfflineBanner ? colors.warning : colors.success}
      />
      <View style={styles.copy}>
        <Text style={styles.title}>
          {isOfflineBanner ? "You're offline" : "Back online"}
        </Text>
        <Text style={styles.subtitle}>
          {isOfflineBanner
            ? "Some information may be from your last visit."
            : "You can continue shopping."}
        </Text>
      </View>
      {isOfflineBanner ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss offline notice"
          hitSlop={8}
          onPress={() => setDismissedOffline(true)}
          style={styles.dismiss}
        >
          <Ionicons name="close" size={16} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  offline: {
    backgroundColor: "#FFFBEB",
  },
  online: {
    backgroundColor: colors.successMuted,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: typography.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: typography.xs,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  dismiss: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
  },
});
