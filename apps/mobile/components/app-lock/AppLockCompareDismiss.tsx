import { useEffect } from "react";

import { useAppLockOptional } from "@/providers/AppLockProvider";
import { useProductCompare } from "@/providers/compare-context";

/**
 * Native Modals render above View-based overlays. Close the compare sheet
 * whenever App Lock is showing so product UI cannot sit above the lock Modal.
 */
export function AppLockCompareDismiss() {
  const appLock = useAppLockOptional();
  const { setSheetOpen } = useProductCompare();

  useEffect(() => {
    if (appLock?.isLocked) {
      setSheetOpen(false);
    }
  }, [appLock?.isLocked, setSheetOpen]);

  return null;
}
