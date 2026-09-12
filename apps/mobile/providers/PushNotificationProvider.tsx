import { useConvex, useMutation } from "convex/react";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import { PushPermissionPrompt } from "@/components/notifications/PushPermissionPrompt";
import {
  configureForegroundNotificationBehavior,
  parsePushNotificationData,
} from "@/lib/push-notifications";
import { resolvePushEnrollmentCredentials } from "@/lib/push-enrollment";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  loadCheckoutCustomer,
  loadPushEnrollmentProof,
} from "@/lib/checkout-customer-storage";
import { api } from "@/lib/convex-api";
import {
  addMonitoringBreadcrumb,
  captureMonitoringError,
} from "@/lib/monitoring/sentry";
import { logAppError } from "@/lib/errors";
import {
  resolveNotificationTargetHref,
  type NotificationNavigationCredentials,
} from "@/lib/notification-navigation";
import { getVisitorId } from "@/lib/visitor-id";

type PushNotificationContextValue = {
  permission: "undetermined" | "granted" | "denied" | "unavailable";
  expoPushToken: string | null;
  syncing: boolean;
  lastError: string | null;
  enablePushNotifications: (customerEmail?: string, accessToken?: string) => Promise<boolean>;
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

type NotificationAccess = NotificationNavigationCredentials & {
  customerEmail: string;
  visitorId: string;
};

async function resolveNotificationAccess(): Promise<NotificationAccess | null> {
  const [customer, enrollmentProof, visitorId] = await Promise.all([
    loadCheckoutCustomer(),
    loadPushEnrollmentProof(),
    getVisitorId(),
  ]);

  const customerEmail =
    customer?.email?.trim().toLowerCase() ??
    enrollmentProof?.email?.trim().toLowerCase() ??
    null;

  if (!customerEmail || !visitorId) {
    return null;
  }

  return {
    customerEmail,
    visitorId,
    accessToken: enrollmentProof?.accessToken ?? undefined,
  };
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const convex = useConvex();
  const push = usePushNotifications();
  const markReadByEventKey = useMutation(api.inAppNotifications.markReadByEventKey);
  const handledNotificationIds = useRef<Set<string>>(new Set());

  const enablePushNotifications = useCallback(
    async (customerEmail?: string, accessToken?: string) => {
      const enrollment =
        customerEmail != null
          ? { customerEmail, accessToken }
          : await resolvePushEnrollmentCredentials();

      const result = await push.syncTokenWithBackend({
        requestPermission: true,
        customerEmail: customerEmail ?? enrollment?.customerEmail,
        accessToken: accessToken ?? enrollment?.accessToken,
      });
      return result.success;
    },
    [push]
  );

  const navigateFromNotification = useCallback(
    async (data: Record<string, unknown> | undefined) => {
      const parsed = parsePushNotificationData(data);
      if (!parsed) {
        return;
      }

      addMonitoringBreadcrumb("Notification opened", "notification", {
        event: parsed.event,
        eventKey: parsed.eventKey,
      });

      const access = await resolveNotificationAccess();
      const credentials: NotificationNavigationCredentials | undefined = access
        ? {
            customerEmail: access.customerEmail,
            accessToken: access.accessToken,
          }
        : undefined;

      if (parsed.eventKey && access) {
        try {
          await markReadByEventKey({
            eventKey: parsed.eventKey,
            customerEmail: access.customerEmail,
            visitorId: access.visitorId,
            accessToken: access.accessToken,
          });
        } catch (error) {
          logAppError(error, {
            segment: "notification-mark-read",
            expected: true,
          });
        }
      }

      addMonitoringBreadcrumb("Deep-link navigation started", "notification", {
        eventKey: parsed.eventKey,
      });

      if (parsed.eventKey && access) {
        const target = await convex.query(
          api.inAppNotifications.resolveNotificationTargetByEventKey,
          {
            eventKey: parsed.eventKey,
            customerEmail: access.customerEmail,
            visitorId: access.visitorId,
            accessToken: access.accessToken,
          }
        );

        const href = resolveNotificationTargetHref({
          parsed,
          deepLinkPath: target?.deepLinkPath,
          orderNumber: target?.orderNumber,
          credentials,
        });

        if (href) {
          router.push(href);
          addMonitoringBreadcrumb("Deep-link navigation succeeded", "notification");
          return;
        }
      }

      const fallbackHref = resolveNotificationTargetHref({
        parsed,
        credentials,
      });

      if (fallbackHref) {
        router.push(fallbackHref);
        addMonitoringBreadcrumb("Deep-link navigation succeeded", "notification");
      }
    },
    [convex, markReadByEventKey]
  );

  useEffect(() => {
    configureForegroundNotificationBehavior();
  }, []);

  useEffect(() => {
    const handleReceived = (notification: Notifications.Notification) => {
      const parsed = parsePushNotificationData(
        notification.request.content.data as Record<string, unknown>
      );
      if (parsed) {
        addMonitoringBreadcrumb("Notification received", "notification", {
          event: parsed.event,
          eventKey: parsed.eventKey,
        });
      }
    };

    const receivedSubscription =
      Notifications.addNotificationReceivedListener(handleReceived);

    return () => receivedSubscription.remove();
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

      void navigateFromNotification(
        response.notification.request.content.data as Record<string, unknown>
      ).catch((error) => {
        captureMonitoringError(error, {
          segment: "notification-deep-link",
        });
        addMonitoringBreadcrumb("Deep-link navigation failed", "notification");
      });
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
  }, [navigateFromNotification]);

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
      <PushPermissionPrompt />
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
