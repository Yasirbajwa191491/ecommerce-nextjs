import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

type MonitoringContext = {
  segment?: string;
  digest?: string;
  level?: "error" | "warning" | "info";
  tags?: Record<string, string>;
  extra?: Record<string, string | number | boolean | null | undefined>;
};

type SentryModule = typeof import("@sentry/react-native");

let monitoringEnabled = false;
let sentryModule: SentryModule | null = null;
let sentryLoadAttempted = false;

function shouldEnableMonitoring(): boolean {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return false;
  }

  // Native Sentry requires a dev/production build; loading it in Expo Go crashes.
  if (__DEV__) {
    return false;
  }

  return true;
}

function getSentry(): SentryModule | null {
  if (sentryLoadAttempted) {
    return sentryModule;
  }

  sentryLoadAttempted = true;

  if (!shouldEnableMonitoring()) {
    return null;
  }

  try {
    // Lazy require keeps the app bootable when Sentry native modules are unavailable.
    sentryModule = require("@sentry/react-native") as SentryModule;
    return sentryModule;
  } catch {
    sentryModule = null;
    return null;
  }
}

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
  if (!shouldEnableMonitoring()) {
    return;
  }

  const Sentry = getSentry();
  if (!Sentry) {
    return;
  }

  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN!.trim(),
      enabled: true,
      environment: "production",
      release: getRelease(),
      dist:
        Constants.nativeBuildVersion ??
        Constants.expoConfig?.android?.versionCode?.toString(),
      tracesSampleRate: 0.1,
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

  const Sentry = getSentry();
  if (!Sentry) return;

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

  const Sentry = getSentry();
  if (!Sentry) return;

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

  const Sentry = getSentry();
  if (!Sentry) return;

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

  const Sentry = getSentry();
  if (!Sentry) return;

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

  const Sentry = getSentry();
  if (!Sentry) return;

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
