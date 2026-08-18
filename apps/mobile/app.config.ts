import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Yasir Shop",
  slug: "ecommerce-mobile",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "ecommerce",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yasir.ecommerce",
  },
  android: {
    package: "com.yasir.ecommerce",
    adaptiveIcon: {
      backgroundColor: "#6254f3",
    },
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "ecommerce",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    router: {
      origin: false,
    },
  },
};

export default config;
