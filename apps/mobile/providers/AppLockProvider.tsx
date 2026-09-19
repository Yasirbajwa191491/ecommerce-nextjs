import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AppState,
  Modal,
  type AppStateStatus,
  Platform,
  StyleSheet,
  View,
} from "react-native";

import { AppLockBootstrapCover } from "@/components/app-lock/AppLockBootstrapCover";
import { AppLockPrivacyOverlay } from "@/components/app-lock/AppLockPrivacyOverlay";
import { AppLockScreen } from "@/components/app-lock/AppLockScreen";
import {
  authenticateWithBiometrics,
  createDisabledConfig,
  createEnabledConfig,
  DEFAULT_APP_LOCK_CONFIG,
  getBiometricCapability,
  getCurrentEnrolledLevel,
  isBiometricEnrollmentValid,
  isTimeoutRelaxation,
  readAppLockConfig,
  setAppLockGateState,
  shouldRequireAuthOnResume,
  shouldShowBrandedLockScreen,
  shouldShowLockScreen,
  formatLockoutCountdown,
  lockoutSecondsRemaining,
  writeAppLockConfig,
  type AppLockConfig,
  type AppLockTimeoutId,
  type BiometricCapability,
} from "@/lib/app-lock";
import { appLockMessages, messageForCapability } from "@/lib/app-lock/messages";
import type { AuthFailureReason } from "@/lib/app-lock/types";

type AppLockContextValue = {
  hydrated: boolean;
  isLocked: boolean;
  isEnabled: boolean;
  timeoutId: AppLockTimeoutId;
  capability: BiometricCapability;
  lastError: string | null;
  enableAppLock: () => Promise<{ ok: boolean; message?: string }>;
  disableAppLock: () => Promise<{ ok: boolean; message?: string }>;
  setTimeoutId: (timeoutId: AppLockTimeoutId) => Promise<{ ok: boolean; message?: string }>;
  unlock: () => Promise<void>;
  refreshCapability: () => Promise<BiometricCapability>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function AppLockProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [config, setConfig] = useState<AppLockConfig>(DEFAULT_APP_LOCK_CONFIG);
  const [unlocked, setUnlocked] = useState(false);
  const [storageUnreliable, setStorageUnreliable] = useState(false);
  const [capability, setCapability] = useState<BiometricCapability>({
    status: "unavailable",
    label: "Biometrics",
  });
  const [lastError, setLastError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [privacyCoverVisible, setPrivacyCoverVisible] = useState(false);
  const [lockoutEndsAt, setLockoutEndsAt] = useState<number | null>(null);
  const [lockoutNow, setLockoutNow] = useState(() => Date.now());

  const configRef = useRef(config);
  const unlockedRef = useRef(unlocked);
  const storageUnreliableRef = useRef(storageUnreliable);
  const lastBackgroundAtRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const authInFlightRef = useRef(false);
  const suppressResumeLockRef = useRef(false);
  const autoPromptedRef = useRef(false);

  useEffect(() => {
    configRef.current = config;
  }, [config]);

  useEffect(() => {
    unlockedRef.current = unlocked;
  }, [unlocked]);

  useEffect(() => {
    storageUnreliableRef.current = storageUnreliable;
  }, [storageUnreliable]);

  const showLock = shouldShowLockScreen({
    hydrated,
    enabled: config.enabled,
    unlocked,
    storageUnreliable,
  });

  const showBrandedLock = shouldShowBrandedLockScreen({
    hydrated,
    enabled: config.enabled,
    unlocked,
    storageUnreliable,
  });

  const showBootstrapCover = !hydrated;
  const lockoutSecondsLeft =
    lockoutEndsAt == null
      ? 0
      : lockoutSecondsRemaining(lockoutEndsAt, lockoutNow);
  const lockoutMessage =
    lockoutSecondsLeft > 0
      ? appLockMessages.lockoutCountdown(
          formatLockoutCountdown(lockoutSecondsLeft)
        )
      : lastError;

  useEffect(() => {
    if (lockoutEndsAt == null) return;

    const id = setInterval(() => {
      const now = Date.now();
      setLockoutNow(now);
      if (now >= lockoutEndsAt) {
        setLockoutEndsAt(null);
        setLastError(appLockMessages.lockoutReady);
      }
    }, 250);

    return () => clearInterval(id);
  }, [lockoutEndsAt]);

  useEffect(() => {
    setAppLockGateState({
      locked: showLock,
      enabled: config.enabled,
    });
  }, [showLock, config.enabled]);

  const refreshCapability = useCallback(async () => {
    const next = await getBiometricCapability();
    setCapability(next);
    return next;
  }, []);

  const hydrate = useCallback(async (): Promise<{
    enabled: boolean;
    storageUnreliable: boolean;
  }> => {
    // Read SecureStore first — do not wait on biometric APIs when App Lock is off
    // (those calls can hang/slow on some devices and were showing a false lock screen).
    const stored = await readAppLockConfig();

    if (!stored.ok) {
      if (stored.error === "unavailable") {
        setStorageUnreliable(false);
        setConfig(DEFAULT_APP_LOCK_CONFIG);
        setUnlocked(true);
        setHydrated(true);
        setLastError(null);
        void refreshCapability();
        return { enabled: false, storageUnreliable: false };
      }

      setStorageUnreliable(true);
      setConfig(DEFAULT_APP_LOCK_CONFIG);
      setUnlocked(false);
      setHydrated(true);
      setLastError(appLockMessages.storageReadFailed);
      void refreshCapability();
      return { enabled: false, storageUnreliable: true };
    }

    const nextConfig = stored.value;
    setStorageUnreliable(false);

    if (!nextConfig.enabled) {
      setConfig(nextConfig);
      setUnlocked(true);
      setHydrated(true);
      setLastError(null);
      void refreshCapability();
      return { enabled: false, storageUnreliable: false };
    }

    const [nextCapability, enrolledLevel] = await Promise.all([
      getBiometricCapability(),
      getCurrentEnrolledLevel(),
    ]);
    setCapability(nextCapability);

    if (
      !isBiometricEnrollmentValid({
        enabled: true,
        biometricEnrolled: nextCapability.status === "ready",
        enrolledLevel,
      })
    ) {
      setLastError(appLockMessages.biometricChanged);
      setConfig(nextConfig);
      setUnlocked(false);
      setHydrated(true);
      return { enabled: true, storageUnreliable: false };
    }

    setConfig(nextConfig);
    setUnlocked(false);
    setHydrated(true);
    setLastError(null);
    return { enabled: true, storageUnreliable: false };
  }, [refreshCapability]);

  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      void hydrate().then(() => {
        if (cancelled) return;
      });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [hydrate]);

  const markSessionUnlocked = useCallback(() => {
    // Prevent the active transition that follows a biometric sheet from
    // immediately re-locking and flashing protected UI.
    suppressResumeLockRef.current = true;
    lastBackgroundAtRef.current = null;
    setLockoutEndsAt(null);
    setUnlocked(true);
    setPrivacyCoverVisible(false);
    setLastError(null);
  }, []);

  const applyAuthFailure = useCallback(
    (result: {
      reason: AuthFailureReason;
      message: string;
      retryAfterMs?: number;
    }) => {
      setUnlocked(false);
      if (result.reason === "lockout") {
        const retryMs = result.retryAfterMs ?? 30_000;
        const endsAt = Date.now() + retryMs;
        setLockoutEndsAt(endsAt);
        setLockoutNow(Date.now());
        setLastError(
          appLockMessages.lockoutCountdown(
            formatLockoutCountdown(Math.ceil(retryMs / 1000))
          )
        );
        return;
      }
      setLastError(result.message);
    },
    []
  );

  const repairCorruptStorageAfterAuth = useCallback(async () => {
    const repaired = createDisabledConfig(null);
    const stored = await writeAppLockConfig(repaired);
    if (!stored.ok) {
      setLastError(appLockMessages.storageWriteFailed);
      return false;
    }
    setStorageUnreliable(false);
    setConfig(repaired);
    markSessionUnlocked();
    return true;
  }, [markSessionUnlocked]);

  const unlock = useCallback(async () => {
    if (authInFlightRef.current) return;
    if (lockoutEndsAt != null && Date.now() < lockoutEndsAt) return;
    if (!configRef.current.enabled && !storageUnreliableRef.current) return;

    authInFlightRef.current = true;
    setAuthBusy(true);
    setLastError(null);

    try {
      let effectiveEnabled = configRef.current.enabled;
      let effectiveUnreliable = storageUnreliableRef.current;

      if (effectiveUnreliable) {
        const hydratedState = await hydrate();
        effectiveEnabled = hydratedState.enabled;
        effectiveUnreliable = hydratedState.storageUnreliable;

        if (!effectiveEnabled && !effectiveUnreliable) {
          markSessionUnlocked();
          return;
        }

        if (effectiveUnreliable) {
          const nextCapability = await refreshCapability();
          if (nextCapability.status !== "ready") {
            setLastError(
              messageForCapability(nextCapability.status) ??
                appLockMessages.unavailable
            );
            return;
          }

          const repairAuth = await authenticateWithBiometrics({
            promptMessage: `Unlock with ${nextCapability.label}`,
          });
          if (!repairAuth.ok) {
            applyAuthFailure(repairAuth);
            return;
          }

          await repairCorruptStorageAfterAuth();
          return;
        }
      }

      if (!effectiveEnabled) {
        markSessionUnlocked();
        return;
      }

      const nextCapability = await refreshCapability();
      if (nextCapability.status !== "ready") {
        setLastError(
          messageForCapability(nextCapability.status) ?? appLockMessages.unavailable
        );
        return;
      }

      const enrolledLevel = await getCurrentEnrolledLevel();
      if (
        !isBiometricEnrollmentValid({
          enabled: true,
          biometricEnrolled: true,
          enrolledLevel,
        })
      ) {
        setLastError(appLockMessages.biometricChanged);
        return;
      }

      const result = await authenticateWithBiometrics({
        promptMessage: `Unlock with ${nextCapability.label}`,
      });

      if (result.ok) {
        markSessionUnlocked();
        return;
      }

      applyAuthFailure(result);
    } finally {
      authInFlightRef.current = false;
      setAuthBusy(false);
    }
  }, [
    applyAuthFailure,
    hydrate,
    lockoutEndsAt,
    markSessionUnlocked,
    refreshCapability,
    repairCorruptStorageAfterAuth,
  ]);

  useEffect(() => {
    if (!showBrandedLock) return;
    if (autoPromptedRef.current) return;
    if (Platform.OS === "web") return;

    autoPromptedRef.current = true;
    void unlock();
  }, [showBrandedLock, unlock]);

  useEffect(() => {
    if (!showBrandedLock) {
      autoPromptedRef.current = false;
    }
  }, [showBrandedLock]);

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      const previous = appStateRef.current;
      appStateRef.current = nextState;

      const enabled = configRef.current.enabled;

      // Biometric sheets drive active ↔ inactive. Ignore AppState lock side
      // effects for the duration of an auth attempt.
      if (authInFlightRef.current) {
        return;
      }

      if (!enabled) {
        if (nextState === "active") {
          setPrivacyCoverVisible(false);
        }
        return;
      }

      // Privacy cover on leaving the foreground (app switcher). Timeout only
      // starts on true background — not inactive (Control Center / Face ID).
      if (
        (nextState === "background" || nextState === "inactive") &&
        previous === "active"
      ) {
        if (unlockedRef.current) {
          setPrivacyCoverVisible(true);
        }
        if (nextState === "background") {
          lastBackgroundAtRef.current = Date.now();
        }
        return;
      }

      if (nextState === "active" && previous !== "active") {
        // Skip the active transition that immediately follows a successful
        // biometric unlock (system sheet dismissal).
        if (suppressResumeLockRef.current) {
          suppressResumeLockRef.current = false;
          setPrivacyCoverVisible(false);
          return;
        }

        const requiresAuth = shouldRequireAuthOnResume({
          enabled: true,
          timeoutId: configRef.current.timeoutId,
          lastBackgroundAt: lastBackgroundAtRef.current,
          now: Date.now(),
        });

        if (requiresAuth) {
          setUnlocked(false);
          autoPromptedRef.current = false;
        } else {
          setPrivacyCoverVisible(false);
        }
      }
    };

    const subscription = AppState.addEventListener("change", onChange);
    return () => subscription.remove();
  }, []);

  const enableAppLock = useCallback(async () => {
    if (Platform.OS === "web") {
      return { ok: false, message: appLockMessages.unsupportedPlatform };
    }

    const nextCapability = await refreshCapability();
    if (nextCapability.status !== "ready") {
      return {
        ok: false,
        message:
          messageForCapability(nextCapability.status) ?? appLockMessages.unavailable,
      };
    }

    authInFlightRef.current = true;
    try {
      const auth = await authenticateWithBiometrics({
        promptMessage: `Enable App Lock with ${nextCapability.label}`,
      });
      if (!auth.ok) {
        return {
          ok: false,
          message:
            auth.reason === "cancelled"
              ? appLockMessages.enableCancelled
              : appLockMessages.enableFailed,
        };
      }

      const enrolledLevel = await getCurrentEnrolledLevel();
      const nextConfig = createEnabledConfig({
        timeoutId: configRef.current.timeoutId,
        enrolledLevel,
      });
      const stored = await writeAppLockConfig(nextConfig);
      if (!stored.ok) {
        return {
          ok: false,
          message:
            stored.error === "unavailable"
              ? appLockMessages.storageUnavailable
              : appLockMessages.storageWriteFailed,
        };
      }

      setStorageUnreliable(false);
      setConfig(nextConfig);
      markSessionUnlocked();
      return { ok: true };
    } finally {
      authInFlightRef.current = false;
    }
  }, [markSessionUnlocked, refreshCapability]);

  const disableAppLock = useCallback(async () => {
    if (!configRef.current.enabled) {
      return { ok: true };
    }

    const nextCapability = await refreshCapability();
    if (nextCapability.status !== "ready") {
      return {
        ok: false,
        message:
          messageForCapability(nextCapability.status) ?? appLockMessages.unavailable,
      };
    }

    authInFlightRef.current = true;
    try {
      const auth = await authenticateWithBiometrics({
        promptMessage: `Disable App Lock with ${nextCapability.label}`,
      });
      if (!auth.ok) {
        return {
          ok: false,
          message:
            auth.reason === "cancelled"
              ? appLockMessages.disableCancelled
              : appLockMessages.disableFailed,
        };
      }

      const nextConfig = createDisabledConfig(configRef.current);
      const stored = await writeAppLockConfig(nextConfig);
      if (!stored.ok) {
        return {
          ok: false,
          message:
            stored.error === "unavailable"
              ? appLockMessages.storageUnavailable
              : appLockMessages.storageWriteFailed,
        };
      }

      setConfig(nextConfig);
      markSessionUnlocked();
      return { ok: true };
    } finally {
      authInFlightRef.current = false;
    }
  }, [markSessionUnlocked, refreshCapability]);

  const setTimeoutId = useCallback(
    async (timeoutId: AppLockTimeoutId) => {
      const current = configRef.current.timeoutId;
      if (timeoutId === current) {
        return { ok: true };
      }

      if (isTimeoutRelaxation(current, timeoutId)) {
        const nextCapability = await refreshCapability();
        if (nextCapability.status !== "ready") {
          return {
            ok: false,
            message:
              messageForCapability(nextCapability.status) ??
              appLockMessages.unavailable,
          };
        }

        authInFlightRef.current = true;
        try {
          const auth = await authenticateWithBiometrics({
            promptMessage: `Confirm timeout change with ${nextCapability.label}`,
          });
          if (!auth.ok) {
            return {
              ok: false,
              message:
                auth.reason === "cancelled"
                  ? appLockMessages.timeoutRelaxCancelled
                  : appLockMessages.timeoutRelaxFailed,
            };
          }
        } finally {
          authInFlightRef.current = false;
        }
      }

      const nextConfig: AppLockConfig = {
        ...configRef.current,
        timeoutId,
      };
      const stored = await writeAppLockConfig(nextConfig);
      if (!stored.ok) {
        return {
          ok: false,
          message:
            stored.error === "unavailable"
              ? appLockMessages.storageUnavailable
              : appLockMessages.storageWriteFailed,
        };
      }
      setConfig(nextConfig);
      return { ok: true };
    },
    [refreshCapability]
  );

  const value: AppLockContextValue = {
    hydrated,
    isLocked: showLock,
    isEnabled: config.enabled,
    timeoutId: config.timeoutId,
    capability,
    lastError,
    enableAppLock,
    disableAppLock,
    setTimeoutId,
    unlock,
    refreshCapability,
  };

  return (
    <AppLockContext.Provider value={value}>
      <View style={styles.fill}>
        <View
          style={styles.fill}
          pointerEvents={showLock ? "none" : "auto"}
          accessibilityElementsHidden={showLock}
          importantForAccessibility={showLock ? "no-hide-descendants" : "yes"}
        >
          {children}
        </View>

        {privacyCoverVisible && !showLock ? <AppLockPrivacyOverlay /> : null}

        <Modal
          visible={showBootstrapCover || showBrandedLock}
          animationType="fade"
          presentationStyle="fullScreen"
          transparent={false}
          onRequestClose={() => {
            if (showBrandedLock) {
              void unlock();
            }
          }}
          accessibilityViewIsModal={showBrandedLock}
        >
          {showBrandedLock ? (
            <AppLockScreen
              biometricLabel={capability.label}
              busy={authBusy}
              errorMessage={lockoutMessage}
              lockoutSecondsLeft={lockoutSecondsLeft}
              onUnlock={() => {
                void unlock();
              }}
            />
          ) : (
            <AppLockBootstrapCover />
          )}
        </Modal>
      </View>
    </AppLockContext.Provider>
  );
}

export function useAppLock(): AppLockContextValue {
  const context = useContext(AppLockContext);
  if (!context) {
    throw new Error("useAppLock must be used within AppLockProvider");
  }
  return context;
}

export function useAppLockOptional(): AppLockContextValue | null {
  return useContext(AppLockContext);
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
