import { useQuery } from "convex/react";

import { api } from "@/lib/convex-api";
import { offlineKeys } from "@/lib/offline/keys";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { resolveSiteSettings, type SiteSettingsMap } from "@/lib/site-settings";

export function usePublicSettingsMap() {
  const live = useQuery(api.settings.listPublic);
  const cached = useOfflineCache<SiteSettingsMap>(offlineKeys.settings, live);
  const { isOnline } = useNetworkStatus();

  return {
    map: (live ?? cached.data) as SiteSettingsMap | undefined,
    isLoading: live === undefined && !cached.data && isOnline,
    fromCache: live === undefined && Boolean(cached.data),
  };
}

export function useSiteSettings() {
  const { map, isLoading, fromCache } = usePublicSettingsMap();

  return {
    ...resolveSiteSettings(map),
    isLoading,
    fromCache,
  };
}
