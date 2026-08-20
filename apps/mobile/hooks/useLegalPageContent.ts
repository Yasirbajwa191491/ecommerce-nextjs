import { useMemo } from "react";
import { useQuery } from "convex/react";

import { api } from "@/lib/convex-api";
import {
  type PolicySettingKey,
  settingValueToParagraphs,
} from "@/lib/legal-content";

export function useLegalPageContent(key: PolicySettingKey) {
  const map = useQuery(api.settings.listPublic);

  const paragraphs = useMemo(() => {
    return settingValueToParagraphs(map?.[key], key);
  }, [key, map]);

  return {
    paragraphs,
    isLoading: map === undefined,
  };
}
