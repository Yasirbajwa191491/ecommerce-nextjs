import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sizes, spacing } from "@/constants/theme";
import { useUnreadNotificationCount } from "@/hooks/useNotificationCenter";
import { useTheme } from "@/providers/theme-context";

type NotificationBellProps = {
  color?: string;
};

export function NotificationBell({ color }: NotificationBellProps) {
  const { colors } = useTheme();
  const { count, capped, hasAccess } = useUnreadNotificationCount();
  const iconColor = color ?? colors.foreground;

  if (!hasAccess) {
    return null;
  }

  const label = count > 0 ? `${count}${capped ? "+" : ""} unread notifications` : "Notifications";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => router.push("/notifications" as Href)}
      style={styles.button}
    >
      <Ionicons name="notifications-outline" size={sizes.iconMd} color={iconColor} />
      {count > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors.cta }]}>
          <Text style={[styles.badgeText, { color: colors.ctaForeground }]}>
            {capped ? "99+" : count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: sizes.qtyControl,
    height: sizes.qtyControl,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
