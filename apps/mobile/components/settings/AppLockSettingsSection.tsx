import * as Linking from "expo-linking";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import {
  SettingsRow,
  SettingsSection,
  SettingsToggleRow,
} from "@/components/settings/SettingsSection";
import { spacing, typography } from "@/constants/theme";
import {
  APP_LOCK_TIMEOUT_OPTIONS,
  appLockMessages,
  messageForCapability,
  type AppLockTimeoutId,
} from "@/lib/app-lock";
import { useAppLock } from "@/providers/AppLockProvider";
import { useTheme } from "@/providers/theme-context";
import { useToast } from "@/providers/toast-context";

export function AppLockSettingsSection() {
  const { colors } = useTheme();
  const { showError, showSuccess } = useToast();
  const {
    isEnabled,
    timeoutId,
    capability,
    enableAppLock,
    disableAppLock,
    setTimeoutId,
    refreshCapability,
  } = useAppLock();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void refreshCapability();
  }, [refreshCapability]);

  const handleToggle = useCallback(
    async (next: boolean) => {
      if (busy) return;
      setBusy(true);
      try {
        if (next) {
          const result = await enableAppLock();
          if (!result.ok) {
            showError(result.message ?? appLockMessages.enableFailed);
            return;
          }
          showSuccess("App Lock enabled");
          return;
        }

        const result = await disableAppLock();
        if (!result.ok) {
          showError(result.message ?? appLockMessages.disableFailed);
          return;
        }
        showSuccess("App Lock disabled");
      } finally {
        setBusy(false);
      }
    },
    [busy, disableAppLock, enableAppLock, showError, showSuccess]
  );

  const handleTimeoutChange = useCallback(
    async (next: AppLockTimeoutId) => {
      if (busy || next === timeoutId) return;
      setBusy(true);
      try {
        const result = await setTimeoutId(next);
        if (!result.ok) {
          showError(result.message ?? appLockMessages.storageWriteFailed);
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, setTimeoutId, showError, timeoutId]
  );

  const capabilityMessage = messageForCapability(capability.status);
  const toggleDisabled =
    busy ||
    (!isEnabled && capability.status !== "ready");

  return (
    <SettingsSection
      title={appLockMessages.settingsSection}
      footer={appLockMessages.timeoutFooter}
    >
      <SettingsToggleRow
        label={appLockMessages.settingsTitle}
        subtitle={
          isEnabled
            ? appLockMessages.settingsEnabled
            : appLockMessages.settingsSubtitle
        }
        value={isEnabled}
        onValueChange={(value) => {
          void handleToggle(value);
        }}
        disabled={toggleDisabled}
        isLast={!isEnabled && capability.status === "ready"}
      />

      {!isEnabled && capabilityMessage ? (
        <>
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 18 }}>
              {capabilityMessage}
            </Text>
          </View>
          {(capability.status === "not_enrolled" ||
            capability.status === "no_hardware") && (
            <SettingsRow
              label={appLockMessages.openDeviceSettings}
              showChevron
              onPress={() => {
                void Linking.openSettings();
              }}
              isLast
            />
          )}
        </>
      ) : null}

      {isEnabled ? (
        <>
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.sm,
              paddingBottom: spacing.xs,
            }}
          >
            <Text
              style={{
                color: colors.muted,
                fontSize: typography.xs,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {appLockMessages.requireAuthLabel}
            </Text>
          </View>
          {APP_LOCK_TIMEOUT_OPTIONS.map((option, index) => {
            const selected = timeoutId === option.id;
            const isLast = index === APP_LOCK_TIMEOUT_OPTIONS.length - 1;
            return (
              <SettingsRow
                key={option.id}
                label={option.label}
                onPress={() => {
                  void handleTimeoutChange(option.id);
                }}
                trailing={
                  selected ? (
                    <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: "600" }}>
                      Selected
                    </Text>
                  ) : undefined
                }
                accessibilityHint={`Require authentication ${option.label.toLowerCase()}`}
                isLast={isLast}
              />
            );
          })}
        </>
      ) : null}
    </SettingsSection>
  );
}
