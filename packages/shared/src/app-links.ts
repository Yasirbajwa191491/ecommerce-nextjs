export const APP_LINK_BUNDLE_ID = "com.yasir.ecommerce";

/** HTTPS paths the native app can open. Keep iOS and Android in sync. */
export const APP_LINK_PATH_PREFIXES = [
  "/qr",
  "/product",
  "/category",
  "/track-order",
  "/checkout",
  "/order",
  "/promotions",
] as const;

export const APP_LINK_PATHS = APP_LINK_PATH_PREFIXES.flatMap((prefix) => [prefix, `${prefix}/*`]);

const APPLE_TEAM_ID = /^[A-Z0-9]{10}$/;
const SHA256_FINGERPRINT = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){31}$/;

export function buildAppleAppSiteAssociation(teamId: string | undefined) {
  const team = teamId?.trim().toUpperCase() ?? "";
  if (!APPLE_TEAM_ID.test(team)) return null;
  return {
    applinks: {
      apps: [] as string[],
      details: [
        {
          appID: `${team}.${APP_LINK_BUNDLE_ID}`,
          paths: [...APP_LINK_PATHS],
        },
      ],
    },
  };
}

export function parseSha256Fingerprints(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter((value) => SHA256_FINGERPRINT.test(value));
}

export function buildAssetLinks(fingerprints: string[]) {
  if (fingerprints.length === 0) return null;
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: APP_LINK_BUNDLE_ID,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
