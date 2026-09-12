import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { strings } from "@/lib/i18n/strings";
import {
  deferPushPermissionPrompt,
  shouldShowPushPermissionPrompt,
} from "@/lib/push-prompt-storage";
import { usePushNotificationContextOptional } from "@/providers/PushNotificationProvider";

type PushPermissionPromptProps = {
  /** Delay before showing so the home screen can settle first. */
  delayMs?: number;
};

export function PushPermissionPrompt({ delayMs = 1500 }: PushPermissionPromptProps) {
  const push = usePushNotificationContextOptional();
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!push || push.permission !== "undetermined") {
      setVisible(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void shouldShowPushPermissionPrompt().then((shouldShow) => {
        if (!cancelled && shouldShow) {
          setVisible(true);
        }
      });
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, push, push?.permission]);

  const handleDismiss = useCallback(async () => {
    await deferPushPermissionPrompt();
    setVisible(false);
  }, []);

  const handleEnable = useCallback(async () => {
    if (!push || requesting) {
      return;
    }

    setRequesting(true);
    try {
      await push.enablePushNotifications();
    } finally {
      setRequesting(false);
      setVisible(false);
    }
  }, [push, requesting]);

  if (!push || push.permission !== "undetermined") {
    return null;
  }

  return (
    <ConfirmDialog
      visible={visible}
      title={strings.notifications.promptTitle}
      message={strings.notifications.promptMessage}
      confirmLabel={
        requesting ? strings.common.loading : strings.notifications.promptEnable
      }
      cancelLabel={strings.notifications.promptLater}
      onConfirm={() => void handleEnable()}
      onCancel={() => void handleDismiss()}
    />
  );
}
