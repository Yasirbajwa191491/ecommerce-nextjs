import { useEffect, useRef } from "react";

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
} from "@/lib/push-notifications";
import {
  hasFirstLaunchOsPromptBeenShown,
  markFirstLaunchOsPromptShown,
} from "@/lib/push-first-launch";

type UseFirstLaunchPushPermissionArgs = {
  visitorReady: boolean;
  onPermissionResolved: () => Promise<void>;
  delayMs?: number;
};

/** Shows the native OS notification permission dialog once after first install/open. */
export function useFirstLaunchPushPermission({
  visitorReady,
  onPermissionResolved,
  delayMs = 1800,
}: UseFirstLaunchPushPermissionArgs) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (!visitorReady || startedRef.current) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled || startedRef.current) {
          return;
        }

        startedRef.current = true;

        const [alreadyPrompted, permission] = await Promise.all([
          hasFirstLaunchOsPromptBeenShown(),
          getNotificationPermissionStatus(),
        ]);

        if (cancelled || alreadyPrompted) {
          return;
        }

        if (permission === "granted") {
          await onPermissionResolved();
          return;
        }

        if (permission === "denied") {
          return;
        }

        await requestNotificationPermission();
        await markFirstLaunchOsPromptShown();
        if (!cancelled) {
          await onPermissionResolved();
        }
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [delayMs, onPermissionResolved, visitorReady]);
}
