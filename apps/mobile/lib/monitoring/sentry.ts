import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";

type MonitoringContext = {
  segment?: string;
  digest?: string;
  level?: "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, string | number | boolean | null | undefined>;
};

let monitoringEnabled = false;

function getRelease(): string | undefined {
  const version =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    undefined;
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    undefined;

  if (!version) return undefined;
  return build ? `${version}+${build}` : version;
}

export function initMonitoring(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  try {
    Sentry.init({
      dsn,
      enabled: !__DEV__,
      environment: __DEV__ ? "development" : "production",
      release: getRelease(),
      dist:
        Constants.nativeBuildVersion ??
        Constants.expoConfig?.android?.versionCode?.toString(),
      tracesSampleRate: __DEV__ ? 0 : 0.1,
      enableAutoSessionTracking: true,
      attachStacktrace: true,
      beforeSend(event) {
        return sanitizeMonitoringEvent(event);
      },
    });

    Sentry.setContext("device", {
      platform: Platform.OS,
      model: Device.modelName ?? "unknown",
      osVersion: Device.osVersion ?? "unknown",
      isDevice: Device.isDevice,
      expoSdk: Constants.expoConfig?.sdkVersion ?? "unknown",
    });

    monitoringEnabled = true;
  } catch {
    monitoringEnabled = false;
  }
}

function sanitizeMonitoringEvent<T extends { request?: { headers?: Record<string, string> } }>(
  event: T
): T | null {
  if (event.request?.headers) {
    delete event.request.headers.Authorization;
    delete event.request.headers.Cookie;
  }
  return event;
}

export function isMonitoringEnabled(): boolean {
  return monitoringEnabled;
}

export function addMonitoringBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, string | number | boolean | null | undefined>
): void {
  if (!monitoringEnabled) return;

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      data,
      level: "info",
    });
  } catch {
    // fail-safe
  }
}

export function setMonitoringUserContext(args: {
  visitorId?: string | null;
  customerEmail?: string | null;
}): void {
  if (!monitoringEnabled) return;

  try {
    if (!args.visitorId && !args.customerEmail) {
      Sentry.setUser(null);
      return;
    }

    Sentry.setUser({
      id: args.visitorId ?? undefined,
      email: args.customerEmail ? hashForMonitoring(args.customerEmail) : undefined,
    });
  } catch {
    // fail-safe
  }
}

export function clearMonitoringUserContext(): void {
  if (!monitoringEnabled) return;

  try {
    Sentry.setUser(null);
  } catch {
    // fail-safe
  }
}

export function captureMonitoringError(
  error: unknown,
  context?: MonitoringContext
): void {
  if (!monitoringEnabled) return;

  try {
    Sentry.withScope((scope) => {
      if (context?.segment) scope.setTag("segment", context.segment);
      if (context?.digest) scope.setTag("digest", context.digest);
      if (context?.level) scope.setLevel(context.level);
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      if (context?.extra) {
        scope.setExtras(context.extra);
      }
      Sentry.captureException(error);
    });
  } catch {
    // fail-safe
  }
}

export function captureMonitoringMessage(
  message: string,
  context?: MonitoringContext
): void {
  if (!monitoringEnabled) return;

  try {
    Sentry.withScope((scope) => {
      if (context?.segment) scope.setTag("segment", context.segment);
      if (context?.level) scope.setLevel(context.level);
      if (context?.tags) {
        for (const [key, value] of Object.entries(context.tags)) {
          scope.setTag(key, value);
        }
      }
      Sentry.captureMessage(message, context?.level ?? "info");
    });
  } catch {
    // fail-safe
  }
}

function hashForMonitoring(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `email_${Math.abs(hash)}`;
}

export { Sentry };
