import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL is missing. Create apps/mobile/.env from .env.example (same URL as NEXT_PUBLIC_CONVEX_URL in root .env.local)."
  );
}

export const convex = new ConvexReactClient(convexUrl);
