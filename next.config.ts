import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compiler: { styledComponents: true },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },
};

export default nextConfig;
