import { useQuery } from "convex/react";

import { api } from "@/lib/convex-api";
import { resolveSiteSettings } from "@/lib/site-settings";

export function useSiteSettings() {
  const map = useQuery(api.settings.listPublic);

  return {
    ...resolveSiteSettings(map ?? undefined),
    isLoading: map === undefined,
  };
}
