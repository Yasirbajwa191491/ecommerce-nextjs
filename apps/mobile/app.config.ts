import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Ecommerce Store",
  slug: "ecommerce-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  scheme: "ecommerce",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.yasir.ecommerce",
    infoPlist: {
      NSCameraUsageDescription:
        "Allow camera access to take a photo and find similar products.",
      NSPhotoLibraryUsageDescription:
        "Allow access to your photo library to find similar products.",
      NSUserNotificationsUsageDescription:
        "Allow notifications so we can send order and payment updates.",
    },
    ...(process.env.EXPO_PUBLIC_SITE_URL
      ? {
          associatedDomains: [
            `applinks:${new URL(process.env.EXPO_PUBLIC_SITE_URL).host}`,
          ],
        }
      : {}),
  },
  android: {
    package: "com.yasir.ecommerce",
    softwareKeyboardLayoutMode: "pan",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#6254f3",
    },
    intentFilters: [
      {
        action: "VIEW",
        data: [{ scheme: "ecommerce" }],
        category: ["BROWSABLE", "DEFAULT"],
      },
      ...(process.env.EXPO_PUBLIC_SITE_URL
        ? [
            {
              action: "VIEW" as const,
              autoVerify: true,
              data: [
                {
                  scheme: "https" as const,
                  host: new URL(process.env.EXPO_PUBLIC_SITE_URL).host,
                  pathPrefix: "/product",
                },
                {
                  scheme: "https" as const,
                  host: new URL(process.env.EXPO_PUBLIC_SITE_URL).host,
                  pathPrefix: "/category",
                },
                {
                  scheme: "https" as const,
                  host: new URL(process.env.EXPO_PUBLIC_SITE_URL).host,
                  pathPrefix: "/track-order",
                },
                {
                  scheme: "https" as const,
                  host: new URL(process.env.EXPO_PUBLIC_SITE_URL).host,
                  pathPrefix: "/checkout",
                },
                {
                  scheme: "https" as const,
                  host: new URL(process.env.EXPO_PUBLIC_SITE_URL).host,
                  pathPrefix: "/promotions",
                },
              ],
              category: ["BROWSABLE" as const, "DEFAULT" as const],
            },
          ]
        : []),
    ],
  },
  splash: {
    image: "./assets/icon.png",
    backgroundColor: "#6254f3",
    resizeMode: "contain",
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
    [
      "@stripe/stripe-react-native",
      {
        // Apple Pay entitlement is added only when a non-empty identifier is set.
        merchantIdentifier: process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER ?? "",
        enableGooglePay: process.env.EXPO_PUBLIC_STRIPE_GOOGLE_PAY === "true",
      },
    ],
    "expo-secure-store",
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#6254f3",
        defaultChannel: "order-updates",
      },
    ],
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
