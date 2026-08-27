import Constants from "expo-constants";
import { ConvexReactClient } from "convex/react";

const convexUrl =
  (typeof Constants.expoConfig?.extra?.convexUrl === "string"
    ? Constants.expoConfig.extra.convexUrl
    : undefined) || process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is missing. Set it in apps/mobile/.env (production Convex URL)."
  );
}

export const convex = new ConvexReactClient(convexUrl);
