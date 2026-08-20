import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Ecommerce Store",
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
  web: {
    // static = prerendered pages for EAS Hosting (free *.expo.app URL)
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Allow access to your photo library to find similar products.",
        cameraPermission:
          "Allow camera access to take a photo and find similar products.",
      },
    ],
    "expo-web-browser",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
    router: {
      origin: false,
    },
    eas: {
      projectId: "a92c3120-fdec-4550-bece-3ebd28ee26fa",
    },
  },
};

export default config;
