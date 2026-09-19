import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";

import { BIOMETRIC_TEMP_LOCKOUT_MS } from "@/lib/app-lock/constants";
import {
  appLockMessages,
  messageForAuthFailure,
  messageForCapability,
} from "@/lib/app-lock/messages";
import type {
  AuthAttemptResult,
  AuthFailureReason,
  BiometricCapability,
} from "@/lib/app-lock/types";

function biometricLabelFromTypes(
  types: LocalAuthentication.AuthenticationType[]
): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "Face unlock";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return Platform.OS === "ios" ? "Touch ID" : "Fingerprint";
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "Iris";
  }
  return "Biometrics";
}

export async function getBiometricCapability(): Promise<BiometricCapability> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { status: "unsupported_platform", label: "Biometrics" };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { status: "no_hardware", label: "Biometrics" };
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const label = biometricLabelFromTypes(types);

    if (!enrolled) {
      return { status: "not_enrolled", label };
    }

    return { status: "ready", label };
  } catch {
    return { status: "unavailable", label: "Biometrics" };
  }
}

export async function getCurrentEnrolledLevel(): Promise<number> {
  try {
    return await LocalAuthentication.getEnrolledLevelAsync();
  } catch {
    return LocalAuthentication.SecurityLevel.NONE;
  }
}

export function isBiometricEnrollmentValid(args: {
  enabled: boolean;
  biometricEnrolled: boolean;
  enrolledLevel: number;
}): boolean {
  if (!args.enabled) return true;
  return (
    args.biometricEnrolled &&
    args.enrolledLevel > LocalAuthentication.SecurityLevel.NONE
  );
}

function mapAuthError(error?: string): AuthFailureReason {
  const normalized = (error ?? "").toLowerCase();
  if (
    normalized.includes("cancel") ||
    normalized.includes("user_cancel") ||
    normalized.includes("system_cancel") ||
    normalized.includes("app_cancel")
  ) {
    return "cancelled";
  }
  if (
    normalized.includes("lockout") ||
    normalized.includes("lock_out") ||
    normalized.includes("too many")
  ) {
    return "lockout";
  }
  if (normalized.includes("not_enrolled") || normalized.includes("not enrolled")) {
    return "not_enrolled";
  }
  if (
    normalized.includes("passcode_not_set") ||
    normalized.includes("not_available") ||
    normalized.includes("not available")
  ) {
    return "unavailable";
  }
  if (normalized.includes("no_hardware") || normalized.includes("hardware")) {
    return "no_hardware";
  }
  return "failed";
}

export async function authenticateWithBiometrics(args?: {
  promptMessage?: string;
  cancelLabel?: string;
}): Promise<AuthAttemptResult> {
  const capability = await getBiometricCapability();
  if (capability.status !== "ready") {
    const message =
      messageForCapability(capability.status) ?? appLockMessages.unavailable;
    const reason: AuthFailureReason =
      capability.status === "no_hardware"
        ? "no_hardware"
        : capability.status === "not_enrolled"
          ? "not_enrolled"
          : "unavailable";
    return { ok: false, reason, message };
  }

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:
        args?.promptMessage ?? `Unlock with ${capability.label}`,
      cancelLabel: args?.cancelLabel ?? "Cancel",
      disableDeviceFallback: true,
      biometricsSecurityLevel: "weak",
    });

    if (result.success) {
      return { ok: true };
    }

    const reason = mapAuthError(result.error);
    if (reason === "lockout") {
      return {
        ok: false,
        reason,
        message: appLockMessages.lockout,
        retryAfterMs: BIOMETRIC_TEMP_LOCKOUT_MS,
      };
    }

    return {
      ok: false,
      reason,
      message: messageForAuthFailure(reason),
    };
  } catch {
    return {
      ok: false,
      reason: "unknown",
      message: appLockMessages.failed,
    };
  }
}
