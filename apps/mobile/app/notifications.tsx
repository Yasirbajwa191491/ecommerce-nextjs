import { Ionicons } from "@expo/vector-icons";
import { useConvex, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { router, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EmptyState } from "@/components/feedback/EmptyState";
import { Header } from "@/components/layout/Header";
import { ThemedScreen } from "@/components/layout/ThemedScreen";
import { Button } from "@/components/ui/Button";
import { spacing } from "@/constants/theme";
import { useNotificationCenterAccess } from "@/hooks/useNotificationCenter";
import { useThemedStyles, type ThemeStyleTokens } from "@/hooks/useThemedStyles";
import { api } from "@/lib/convex-api";
import {
  formatNotificationTimestamp,
  getNotificationIcon,
} from "@/lib/notification-display";
import { addMonitoringBreadcrumb, captureMonitoringError } from "@/lib/monitoring/sentry";
import { useTheme } from "@/providers/theme-context";

export default function NotificationsScreen() {
  const { colors, textStyles } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { proof, ready, refresh } = useNotificationCenterAccess();
  const [refreshing, setRefreshing] = useState(false);

  const convex = useConvex();
  const markAsRead = useMutation(api.inAppNotifications.markAsRead);
  const markAllAsRead = useMutation(api.inAppNotifications.markAllAsRead);
  const archiveNotification = useMutation(api.inAppNotifications.archiveNotification);

  const queryArgs = proof
    ? {
        customerEmail: proof.customerEmail,
        visitorId: proof.visitorId,
        accessToken: proof.accessToken,
      }
    : "skip";

  const unread = useQuery(api.inAppNotifications.getUnreadCount, queryArgs);

  const { results, status, loadMore } = usePaginatedQuery(
    api.inAppNotifications.listForCustomer,
    queryArgs,
    { initialNumItems: 20 }
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const navigateToNotification = useCallback(
    async (notification: (typeof results)[number]) => {
      if (!proof) return;

      try {
        addMonitoringBreadcrumb("Notification opened", "notification", {
          eventKey: notification.eventKey,
          type: notification.type,
        });

        if (!notification.readAt) {
          await markAsRead({
            notificationId: notification._id,
            customerEmail: proof.customerEmail,
            visitorId: proof.visitorId,
            accessToken: proof.accessToken,
          });
        }

        const target = await convex.query(api.inAppNotifications.resolveNotificationTarget, {
          notificationId: notification._id,
          customerEmail: proof.customerEmail,
          visitorId: proof.visitorId,
          accessToken: proof.accessToken,
        });

        if (!target) {
          return;
        }

        if (target.deepLinkPath) {
          router.push(target.deepLinkPath as Href);
          return;
        }

        if (target.orderNumber) {
          router.push({
            pathname: "/order/[id]",
            params: {
              id: target.orderNumber,
              orderNumber: target.orderNumber,
            },
          });
        }
      } catch (error) {
        captureMonitoringError(error, {
          segment: "notification-center",
          tags: { type: notification.type },
        });
      }
    },
    [convex, markAsRead, proof]
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!proof) return;
    await markAllAsRead({
      customerEmail: proof.customerEmail,
      visitorId: proof.visitorId,
      accessToken: proof.accessToken,
    });
  }, [markAllAsRead, proof]);

  const handleArchive = useCallback(
    async (notificationId: (typeof results)[number]["_id"]) => {
      if (!proof) return;
      await archiveNotification({
        notificationId,
        customerEmail: proof.customerEmail,
        visitorId: proof.visitorId,
        accessToken: proof.accessToken,
      });
    },
    [archiveNotification, proof]
  );

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

  if (!proof) {
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
      <View style={styles.summaryRow}>
        <Text style={[textStyles.bodySmall, styles.summaryText]}>
          {unread?.count ? `${unread.count}${unread.capped ? "+" : ""} unread` : "All caught up"}
        </Text>
        {results.length > 0 ? (
          <Button
            label="Mark all read"
            variant="ghost"
            size="sm"
            onPress={() => void handleMarkAllRead()}
          />
        ) : null}
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} />
        }
        onEndReached={() => {
          if (status === "CanLoadMore") {
            loadMore(20);
          }
        }}
        ListFooterComponent={
          status === "LoadingMore" ? (
            <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="No notifications yet"
            description="Order and payment updates will appear here, even if push notifications are disabled."
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.readAt && styles.unreadCard]}
            onPress={() => void navigateToNotification(item)}
            onLongPress={() => void handleArchive(item._id)}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primarySubtle }]}>
                <Ionicons
                  name={getNotificationIcon(item.type) as keyof typeof Ionicons.glyphMap}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={[textStyles.sectionTitle, styles.title]}>{item.title}</Text>
                <Text style={[textStyles.bodySmall, styles.body]}>{item.body}</Text>
                <Text style={[textStyles.caption, styles.meta]}>
                  {formatNotificationTimestamp(item.createdAt)}
                </Text>
              </View>
              {!item.readAt ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
            </View>
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
    summaryRow: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryText: {
      color: colors.mutedForeground,
    },
    listContent: {
      padding: spacing.lg,
      gap: spacing.sm,
      flexGrow: 1,
    },
    footerLoader: {
      marginVertical: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderLight,
    },
    unreadCard: {
      borderColor: colors.primary,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    cardContent: {
      flex: 1,
      gap: spacing.xs,
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
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
    },
  });
}
