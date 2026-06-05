"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { resolveSiteSettings } from "@/lib/site-settings";

export function useSiteSettings() {
  const map = useQuery(api.settings.listPublic);

  return {
    ...resolveSiteSettings(map ?? undefined),
    isLoading: map === undefined,
  };
}
