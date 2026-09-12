import { useMutation } from "convex/react";
import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { resolvePushEnrollmentCredentials } from "@/lib/push-enrollment";
import { api } from "@/lib/convex-api";
import { logAppError } from "@/lib/errors";
import { addMonitoringBreadcrumb } from "@/lib/monitoring/sentry";
import { getPushExecutionEnvironment } from "@/lib/push-environment";
import { clearPushPermissionPromptDeferral } from "@/lib/push-prompt-storage";
import {
  ensureAndroidNotificationChannel,
  getExpoPushToken,
  getNotificationPermissionStatus,
  getPushPlatform,
  requestNotificationPermission,
} from "@/lib/push-notifications";
import { useVisitorId } from "@/lib/visitor-id";

type PushSyncState = {
  permission: "undetermined" | "granted" | "denied" | "unavailable";
  expoPushToken: string | null;
  syncing: boolean;
  lastError: string | null;
};

export function usePushNotifications() {
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
  });

  const tokenRef = useRef<string | null>(null);

  const syncTokenWithBackend = useCallback(
    async (options?: {
      requestPermission?: boolean;
      customerEmail?: string;
      accessToken?: string;
    }) => {
      setState((current) => ({ ...current, syncing: true, lastError: null }));

      try {
        await ensureAndroidNotificationChannel();

        let permission = await getNotificationPermissionStatus();
        if (options?.requestPermission && permission !== "granted") {
          addMonitoringBreadcrumb("Push permission requested", "notification");
          permission = await requestNotificationPermission();
        }

        if (permission !== "granted") {
          addMonitoringBreadcrumb(
            permission === "denied" ? "Push permission denied" : "Push permission undetermined",
            "notification"
          );
          setState((current) => ({
            ...current,
            permission: permission === "denied" ? "denied" : "undetermined",
            syncing: false,
          }));
          return { success: false as const, reason: "permission_denied" as const };
        }

        await clearPushPermissionPromptDeferral();

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
          options?.accessToken?.trim() ?? enrollment?.accessToken ?? undefined;

        if (!token || !visitorId || !customerEmail) {
          setState((current) => ({
            ...current,
            permission: "granted",
            expoPushToken: token,
            syncing: false,
            lastError: customerEmail ? null : "missing_customer_email",
          }));
          return {
            success: false as const,
            reason: customerEmail ? "missing_token" : ("missing_customer_email" as const),
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
        });

        return { success: true as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Push sync failed";
        addMonitoringBreadcrumb("Push token sync failed", "notification");
        logAppError(error, { segment: "push-token-sync" });
        setState((current) => ({
          ...current,
          syncing: false,
          lastError: message,
        }));
        return { success: false as const, reason: "error" as const, message };
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

      await syncNotificationPreferences({
        customerEmail,
        orderUpdates: preferences.orderUpdates,
        paymentUpdates: preferences.paymentUpdates,
        promotionalNotifications: preferences.promotionalNotifications,
      });
    },
    [syncNotificationPreferences]
  );

  const deactivateCurrentDevice = useCallback(async () => {
    if (!visitorId) {
      return;
    }
    await deactivatePushTokensForVisitor({ visitorId });
    tokenRef.current = null;
    setState((current) => ({ ...current, expoPushToken: null }));
  }, [deactivatePushTokensForVisitor, visitorId]);

  const refreshPermissionAndSync = useCallback(async () => {
    if (!visitorId) {
      return;
    }

    const permission = await getNotificationPermissionStatus();
    if (permission !== "granted") {
      setState((current) => ({
        ...current,
        permission: permission === "denied" ? "denied" : "undetermined",
      }));
      return;
    }

    await syncTokenWithBackend();
  }, [syncTokenWithBackend, visitorId]);

  useEffect(() => {
    void refreshPermissionAndSync();
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
      });
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.expoPushToken, touchPushToken, visitorId]);

  return {
    ...state,
    syncTokenWithBackend,
    syncPreferences,
    deactivateCurrentDevice,
    refreshPermissionAndSync,
  };
}
