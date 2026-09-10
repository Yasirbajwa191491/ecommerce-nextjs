import { useMutation, usePaginatedQuery } from "convex/react";
import { router, type Href } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Header } from "@/components/layout/Header";
import { ThemedScreen } from "@/components/layout/ThemedScreen";
import { Button } from "@/components/ui/Button";
import { spacing, typography } from "@/constants/theme";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { loadCheckoutCustomer } from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import { useTheme } from "@/providers/theme-context";

export default function NotificationsScreen() {
  const { colors, textStyles } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const markAsRead = useMutation(api.inAppNotifications.markAsRead);
  const markAllAsRead = useMutation(api.inAppNotifications.markAllAsRead);

  useEffect(() => {
    void loadCheckoutCustomer().then((customer) => {
      setCustomerEmail(customer?.email?.trim().toLowerCase() ?? null);
      setReady(true);
    });
  }, []);

  const { results, status, loadMore } = usePaginatedQuery(
    api.inAppNotifications.listForCustomer,
    customerEmail ? { customerEmail } : "skip",
    { initialNumItems: 20 }
  );

  const handleOpen = useCallback(
    async (notification: (typeof results)[number]) => {
      if (!customerEmail) return;

      if (!notification.readAt) {
        await markAsRead({
          notificationId: notification._id,
          customerEmail,
        });
      }

      if (notification.deepLinkPath) {
        router.push(notification.deepLinkPath as Href);
        return;
      }

      if (notification.orderNumber) {
        router.push(`/order/${notification.orderNumber}` as Href);
      }
    },
    [customerEmail, markAsRead]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!customerEmail) return;
    await markAllAsRead({ customerEmail });
  }, [customerEmail, markAllAsRead]);

  if (!ready) {
    return (
      <ThemedScreen>
        <Header title="Notifications" showSearch={false} showBack showCart={false} />
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ThemedScreen>
    );
  }

  if (!customerEmail) {
    return (
      <ThemedScreen>
        <Header title="Notifications" showSearch={false} showBack showCart={false} />
        <EmptyState
          title="No saved customer details"
          description="Complete checkout once so we can show your order notifications here."
          actionLabel="Track an order"
          onAction={() => router.push("/(tabs)/track")}
        />
      </ThemedScreen>
    );
  }

  return (
    <ThemedScreen>
      <Header title="Notifications" showSearch={false} showBack showCart={false} />
      {results.length > 0 ? (
        <View style={styles.actionsRow}>
          <Button
            label="Mark all read"
            variant="ghost"
            size="sm"
            onPress={() => void handleMarkAllRead()}
          />
        </View>
      ) : null}
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        onEndReached={() => {
          if (status === "CanLoadMore") {
            loadMore(20);
          }
        }}
        ListEmptyComponent={
          <EmptyState
            title="No notifications yet"
            description="Order and payment updates will appear here."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.readAt && styles.unreadCard]}
            onPress={() => void handleOpen(item)}
          >
            <Text style={[textStyles.sectionTitle, styles.title]}>{item.title}</Text>
            <Text style={[textStyles.bodySmall, styles.body]}>{item.body}</Text>
            <Text style={[textStyles.caption, styles.meta]}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </Pressable>
        )}
      />
    </ThemedScreen>
  );
}

function createStyles({ colors }: ThemeStyleTokens) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionsRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      alignItems: "flex-end",
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
      gap: spacing.xs,
    },
    unreadCard: {
      borderColor: colors.primary,
    },
    title: {
      color: colors.foreground,
    },
    body: {
      color: colors.mutedForeground,
    },
    meta: {
      color: colors.mutedForeground,
    },
  });
}
