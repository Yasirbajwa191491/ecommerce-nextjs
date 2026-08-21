import { useMemo } from "react";

import {
  type PolicySettingKey,
  settingValueToParagraphs,
} from "@/lib/legal-content";
import { usePublicSettingsMap } from "@/hooks/useSiteSettings";

export function useLegalPageContent(key: PolicySettingKey) {
  const { map, isLoading } = usePublicSettingsMap();

  const paragraphs = useMemo(() => {
    return settingValueToParagraphs(map?.[key], key);
  }, [key, map]);

  return {
    paragraphs,
    isLoading,
  };
}
