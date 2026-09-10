import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import {
  configureForegroundNotificationBehavior,
  parsePushNotificationData,
} from "@/lib/push-notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";

type PushNotificationContextValue = {
  permission: "undetermined" | "granted" | "denied" | "unavailable";
  expoPushToken: string | null;
  syncing: boolean;
  lastError: string | null;
  enablePushNotifications: (customerEmail?: string) => Promise<boolean>;
  syncPreferences: (preferences: {
    orderUpdates: boolean;
    paymentUpdates: boolean;
    promotionalNotifications: boolean;
  }) => Promise<void>;
  deactivateCurrentDevice: () => Promise<void>;
};

const PushNotificationContext = createContext<PushNotificationContextValue | null>(
  null
);

function navigateFromNotification(data: Record<string, unknown> | undefined) {
  const parsed = parsePushNotificationData(data);
  if (!parsed?.deepLinkPath) {
    return;
  }

  router.push(parsed.deepLinkPath as Href);
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const push = usePushNotifications();
  const handledNotificationIds = useRef<Set<string>>(new Set());

  const enablePushNotifications = useCallback(
    async (customerEmail?: string) => {
      const result = await push.syncTokenWithBackend({
        requestPermission: true,
        customerEmail,
      });
      return result.success;
    },
    [push]
  );

  useEffect(() => {
    configureForegroundNotificationBehavior();
  }, []);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const identifier =
        response.notification.request.identifier ??
        JSON.stringify(response.notification.request.content.data);

      if (handledNotificationIds.current.has(identifier)) {
        return;
      }
      handledNotificationIds.current.add(identifier);

      navigateFromNotification(
        response.notification.request.content.data as Record<string, unknown>
      );
    };

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleResponse
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleResponse(response);
      }
    });

    return () => subscription.remove();
  }, []);

  const value: PushNotificationContextValue = {
    permission: push.permission,
    expoPushToken: push.expoPushToken,
    syncing: push.syncing,
    lastError: push.lastError,
    enablePushNotifications,
    syncPreferences: push.syncPreferences,
    deactivateCurrentDevice: push.deactivateCurrentDevice,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotificationContext() {
  const context = useContext(PushNotificationContext);
  if (!context) {
    throw new Error("usePushNotificationContext must be used within PushNotificationProvider");
  }
  return context;
}

export function usePushNotificationContextOptional() {
  return useContext(PushNotificationContext);
}
