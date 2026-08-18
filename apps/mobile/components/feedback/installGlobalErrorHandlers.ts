import { Platform } from "react-native";

import { logAppError } from "@/lib/errors";

type GlobalErrorUtils = {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let installed = false;

function getErrorUtils(): GlobalErrorUtils | undefined {
  // ErrorUtils is not available on web; access defensively on native builds.
  const utils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (
    utils &&
    typeof utils.getGlobalHandler === "function" &&
    typeof utils.setGlobalHandler === "function"
  ) {
    return utils;
  }
  return undefined;
}

/** Log global JS errors without exposing raw dumps to shoppers. */
export function installGlobalErrorHandlers() {
  if (installed) return;
  installed = true;

  const errorUtils = getErrorUtils();
  if (errorUtils) {
    const previousHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      logAppError(error, { segment: isFatal ? "fatal" : "global" });
      previousHandler?.(error, isFatal);
    });
  }

  if (typeof globalThis.addEventListener === "function") {
    globalThis.addEventListener("error", (event) => {
      logAppError(event.error ?? event.message, { segment: "window-error" });
    });

    globalThis.addEventListener("unhandledrejection", (event) => {
      logAppError(event.reason, { segment: "unhandled-rejection" });
    });
  }

  if (Platform.OS === "web" && !errorUtils) {
    // Web relies on window error listeners above.
    return;
  }
}
