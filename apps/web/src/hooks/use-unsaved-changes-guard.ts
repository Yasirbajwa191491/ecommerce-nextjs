"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean;
  enabled?: boolean;
};

export function useUnsavedChangesGuard({
  isDirty,
  enabled = true,
}: UseUnsavedChangesGuardOptions) {
  const [discardOpen, setDiscardOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, isDirty]);

  const requestNavigation = useCallback(
    (action: () => void) => {
      if (!enabled || !isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setDiscardOpen(true);
    },
    [enabled, isDirty]
  );

  const confirmDiscard = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    setDiscardOpen(false);
    action?.();
  }, []);

  const cancelDiscard = useCallback(() => {
    pendingActionRef.current = null;
    setDiscardOpen(false);
  }, []);

  return {
    discardOpen,
    setDiscardOpen,
    requestNavigation,
    confirmDiscard,
    cancelDiscard,
  };
}
