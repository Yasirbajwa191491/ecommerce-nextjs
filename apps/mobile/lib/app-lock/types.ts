export type AppLockTimeoutId = "immediate" | "1m" | "5m" | "15m";

export type AppLockConfig = {
  enabled: boolean;
  timeoutId: AppLockTimeoutId;
  /** LocalAuthentication SecurityLevel snapshot when App Lock was enabled. */
  enrolledLevelAtEnable: number;
};

export type BiometricCapabilityStatus =
  | "ready"
  | "no_hardware"
  | "not_enrolled"
  | "unavailable"
  | "unsupported_platform";

export type BiometricCapability = {
  status: BiometricCapabilityStatus;
  /** Customer-facing label, e.g. "Face ID" or "Fingerprint". */
  label: string;
};

export type AuthFailureReason =
  | "cancelled"
  | "failed"
  | "unavailable"
  | "not_enrolled"
  | "no_hardware"
  | "lockout"
  | "unknown";

export type AuthAttemptResult =
  | { ok: true }
  | {
      ok: false;
      reason: AuthFailureReason;
      message: string;
      /** Present for temporary biometric lockout — client countdown. */
      retryAfterMs?: number;
    };

export type EnableAppLockResult =
  | { ok: true; config: AppLockConfig }
  | { ok: false; message: string };

export type AppLockStorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "unavailable" | "read_failed" | "write_failed" | "invalid" };
