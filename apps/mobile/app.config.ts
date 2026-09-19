import fs from "node:fs";
import path from "node:path";

import type { ExpoConfig } from "expo/config";

const googleServicesPath = path.join(__dirname, "google-services.json");
const hasGoogleServices = fs.existsSync(googleServicesPath);

const plugins: NonNullable<ExpoConfig["plugins"]> = [
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
    "expo-camera",
    {
      cameraPermission: "Allow camera access to scan order, product, and payment QR codes.",
      recordAudioAndroid: false,
    },
  ],
  [
    "@stripe/stripe-react-native",
    {
      merchantIdentifier: process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER ?? "",
      enableGooglePay: process.env.EXPO_PUBLIC_STRIPE_GOOGLE_PAY === "true",
    },
  ],
  "expo-secure-store",
  [
    "expo-local-authentication",
    {
      faceIDPermission:
        "Allow Face ID to unlock the app when App Lock is enabled. Biometric data stays on your device and is never sent to our servers.",
    },
  ],
  [
    "expo-notifications",
    {
      icon: "./assets/icon.png",
      color: "#6254f3",
      defaultChannel: "order-updates",
    },
  ],
  [
    "expo-media-library",
    {
      photosPermission:
        "Allow access to save order receipts to your photo library.",
      savePhotosPermission:
        "Allow access to save order receipts to your photo library.",
      isAccessMediaLocationEnabled: false,
    },
  ],
];

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  plugins.push([
    "@sentry/react-native/expo",
    {
      organization: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
  ]);
}

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
        "Allow camera access to scan QR codes and take a photo to find similar products.",
      NSPhotoLibraryUsageDescription:
        "Allow access to your photo library to save receipts and find similar products.",
      NSPhotoLibraryAddUsageDescription:
        "Allow access to save order receipts to your photo library.",
      NSUserNotificationsUsageDescription:
        "Allow notifications so we can send order and payment updates.",
      NSFaceIDUsageDescription:
        "Allow Face ID to unlock the app when App Lock is enabled. Biometric data stays on your device and is never sent to our servers.",
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
    ...(hasGoogleServices ? { googleServicesFile: "./google-services.json" } : {}),
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
                  pathPrefix: "/qr",
                },
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
                  pathPrefix: "/order",
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
  plugins,
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
