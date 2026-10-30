import { useMutation } from "convex/react";
import Constants from "expo-constants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { resolvePushEnrollmentCredentials } from "@/lib/push-enrollment";
import { api } from "@/lib/convex-api";
import { logAppError } from "@/lib/errors";
import { addMonitoringBreadcrumb } from "@/lib/monitoring/sentry";
import { getPushExecutionEnvironment } from "@/lib/push-environment";
import {
  ensureAndroidNotificationChannel,
  formatPushRegistrationError,
  getExpoPushToken,
  getPushCapability,
  getNotificationPermissionStatus,
  getPushPlatform,
  requestNotificationPermission,
} from "@/lib/push-notifications";
import { getVisitorId, useVisitorId } from "@/lib/visitor-id";

type PushSyncState = {
  permission: "undetermined" | "granted" | "denied" | "unavailable";
  expoPushToken: string | null;
  syncing: boolean;
  lastError: string | null;
  registered: boolean;
};

export function usePushNotifications() {
  const capability = useMemo(() => getPushCapability(), []);
  const visitorId = useVisitorId();
  const registerPushToken = useMutation(api.pushTokens.registerPushToken);
  const touchPushToken = useMutation(api.pushTokens.touchPushToken);
  const deactivatePushTokensForVisitor = useMutation(
    api.pushTokens.deactivatePushTokensForVisitor
  );
  const syncNotificationPreferences = useMutation(
    api.pushTokens.syncNotificationPreferences
  );

  const [state, setState] = useState<PushSyncState>({
    permission: "undetermined",
    expoPushToken: null,
    syncing: false,
    lastError: null,
    registered: false,
  });

  const tokenRef = useRef<string | null>(null);
  const syncingRef = useRef(false);

  const syncTokenWithBackend = useCallback(
    async (options?: {
      requestPermission?: boolean;
      customerEmail?: string;
      accessToken?: string;
    }) => {
      if (syncingRef.current) return { success: false as const, reason: "busy" as const, message: "Order alerts are already being enabled." };
      syncingRef.current = true;
      setState((current) => ({ ...current, syncing: true, lastError: null }));

      try {
        const currentCapability = getPushCapability();
        if (!currentCapability.available) {
          setState((current) => ({ ...current, permission: "unavailable", syncing: false, registered: false, lastError: currentCapability.message }));
          return { success: false as const, reason: "unavailable" as const, message: currentCapability.message ?? "Order alerts are unavailable right now." };
        }
        await ensureAndroidNotificationChannel();

        let permission = await getNotificationPermissionStatus();
        if (options?.requestPermission && permission === "undetermined") {
          addMonitoringBreadcrumb("Push permission requested", "notification");
          permission = await requestNotificationPermission();
        }

        if (permission !== "granted") {
          addMonitoringBreadcrumb(
            permission === "denied" ? "Push permission denied" : "Push permission undetermined",
            "notification"
          );
          const failureMessage =
            permission === "denied"
              ? "Notifications are blocked in system settings."
              : "Notification permission was not granted.";
          setState((current) => ({
            ...current,
            permission: permission === "denied" ? "denied" : "undetermined",
            syncing: false,
            lastError: failureMessage,
            registered: false,
          }));
          return {
            success: false as const,
            reason: "permission_denied" as const,
            message: failureMessage,
          };
        }

        const token = await getExpoPushToken();
        if (token) {
          addMonitoringBreadcrumb("Expo push token obtained", "notification");
        }
        tokenRef.current = token;

        const enrollment = await resolvePushEnrollmentCredentials();
        const customerEmail =
          options?.customerEmail?.trim().toLowerCase() ??
          enrollment?.customerEmail ??
          null;
        const accessToken =
          options?.accessToken?.trim() ?? (enrollment?.customerEmail === customerEmail ? enrollment.accessToken : undefined);

        if (!token || !visitorId || !customerEmail) {
          const failureMessage = !visitorId
            ? "This device is still initializing. Close and reopen the app, then try again."
            : !customerEmail
              ? "Complete checkout and verify your email through secure order recovery to link account-wide alerts."
              : formatPushRegistrationError(
                  "Could not obtain a push token."
                );
          setState((current) => ({
            ...current,
            permission: "granted",
            expoPushToken: token,
            syncing: false,
            lastError: failureMessage,
            registered: false,
          }));
          return {
            success: false as const,
            reason: !token
              ? ("missing_token" as const)
              : !customerEmail
                ? ("missing_customer_email" as const)
                : ("missing_visitor_id" as const),
            message: failureMessage,
          };
        }

        addMonitoringBreadcrumb("Push token sync started", "notification");
        await registerPushToken({
          customerEmail,
          visitorId,
          expoPushToken: token,
          platform: getPushPlatform(),
          appVersion:
            Constants.expoConfig?.version ??
            Constants.nativeAppVersion ??
            undefined,
          executionEnvironment: getPushExecutionEnvironment(),
          ...(accessToken ? { accessToken } : {}),
        });
        addMonitoringBreadcrumb("Push token sync succeeded", "notification");

        setState({
          permission: "granted",
          expoPushToken: token,
          syncing: false,
          lastError: null,
          registered: true,
        });

        return { success: true as const };
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Push sync failed";
        const message = formatPushRegistrationError(rawMessage);
        const permission = await getNotificationPermissionStatus().catch(() => "undetermined" as const);
        addMonitoringBreadcrumb("Push token sync failed", "notification");
        logAppError(error, { segment: "push-token-sync" });
        setState((current) => ({
          ...current,
          permission: permission === "granted" ? "granted" : current.permission,
          syncing: false,
          lastError: message,
          registered: false,
        }));
        return { success: false as const, reason: "error" as const, message };
      } finally {
        syncingRef.current = false;
      }
    },
    [registerPushToken, visitorId]
  );

  const syncPreferences = useCallback(
    async (preferences: {
      orderUpdates: boolean;
      paymentUpdates: boolean;
      promotionalNotifications: boolean;
    }) => {
      const enrollment = await resolvePushEnrollmentCredentials();
      const customerEmail = enrollment?.customerEmail;
      if (!customerEmail) {
        return;
      }

      // Anonymous local preferences remain usable before an order or enrollment exists.
      if (!enrollment?.mailboxVerified && !state.registered) return;
      const owner = visitorId || await getVisitorId();
      await syncNotificationPreferences({
        customerEmail,
        visitorId: owner,
        accessToken: enrollment?.accessToken,
        orderUpdates: preferences.orderUpdates,
        paymentUpdates: preferences.paymentUpdates,
        promotionalNotifications: preferences.promotionalNotifications,
      });
    },
    [syncNotificationPreferences, visitorId, state.registered]
  );

  const deactivateCurrentDevice = useCallback(async () => {
    if (!visitorId) {
      return;
    }
    await deactivatePushTokensForVisitor({ visitorId });
    tokenRef.current = null;
    setState((current) => ({ ...current, expoPushToken: null, registered: false }));
  }, [deactivatePushTokensForVisitor, visitorId]);

  const refreshPermissionAndSync = useCallback(async () => {
    const currentCapability = getPushCapability();
    if (!currentCapability.available) {
      setState((current) => ({ ...current, permission: "unavailable", syncing: false, registered: false, lastError: currentCapability.message }));
      return;
    }
    const permission = await getNotificationPermissionStatus().catch((error: unknown) => {
      logAppError(error, { segment: "push-permission-refresh", expected: true });
      return "undetermined" as const;
    });

    if (permission === "granted") {
      if (!visitorId) {
        setState((current) => ({
          ...current,
          permission: "granted",
          syncing: false,
        }));
        return;
      }
      await syncTokenWithBackend();
      return;
    }

    setState((current) => ({
      ...current,
      permission: permission === "denied" ? "denied" : "undetermined",
      syncing: false,
      registered: false,
    }));
  }, [syncTokenWithBackend, visitorId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshPermissionAndSync();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshPermissionAndSync]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        void refreshPermissionAndSync();
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [refreshPermissionAndSync]);

  useEffect(() => {
    if (!tokenRef.current || !visitorId) {
      return;
    }

    const interval = setInterval(() => {
      void touchPushToken({
        expoPushToken: tokenRef.current!,
        visitorId,
      }).catch((error: unknown) => logAppError(error, { segment: "push-token-touch", expected: true }));
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.expoPushToken, touchPushToken, visitorId]);

  return {
    ...state,
    capability,
    syncTokenWithBackend,
    syncPreferences,
    deactivateCurrentDevice,
    refreshPermissionAndSync,
  };
}
