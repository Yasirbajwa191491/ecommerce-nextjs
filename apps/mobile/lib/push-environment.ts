import Constants from "expo-constants";

/** Distinguishes Expo Go from installed store/dev builds for push routing. */
export function getPushExecutionEnvironment(): string {
  if (Constants.executionEnvironment) {
    return Constants.executionEnvironment;
  }

  if (Constants.appOwnership === "expo") {
    return "storeClient";
  }

  if (Constants.appOwnership === "standalone") {
    return "standalone";
  }

  return "unknown";
}

export function isStandalonePushEnvironment(environment: string): boolean {
  return environment === "standalone" || environment === "bare";
}
