import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import { resolveConvexSiteUrl, resolveSiteUrl } from "./src/lib/resolve-site-url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(appDir, "../..");

loadEnvConfig(monorepoRoot);

const siteUrl = resolveSiteUrl();
const convexSiteUrl = resolveConvexSiteUrl();

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  transpilePackages: [
    "@vapi-ai/web",
    "@daily-co/daily-js",
    "@ecommerce/shared",
  ],
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-node", "sharp"],
  env: {
    SITE_URL: siteUrl,
    NEXT_PUBLIC_SITE_URL: siteUrl,
    ...(convexSiteUrl ? { NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl } : {}),
  },
  compiler: { styledComponents: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.convex.cloud", pathname: "/api/storage/**" },
    ],
  },
};

export default nextConfig;
