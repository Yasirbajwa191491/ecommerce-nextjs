import type { NextConfig } from "next";
import { resolveConvexSiteUrl, resolveSiteUrl } from "./src/lib/resolve-site-url";

const siteUrl = resolveSiteUrl();
const convexSiteUrl = resolveConvexSiteUrl();

const nextConfig: NextConfig = {
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
