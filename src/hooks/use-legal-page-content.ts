"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  DEFAULT_PRIVACY_TIPTAP,
  DEFAULT_TERMS_TIPTAP,
  type RichTextSettingKey,
  settingValueToHtml,
} from "@/lib/legal-content";

const DEFAULTS: Record<RichTextSettingKey, string> = {
  terms_conditions: DEFAULT_TERMS_TIPTAP,
  privacy_policy: DEFAULT_PRIVACY_TIPTAP,
};

export function useLegalPageContent(key: RichTextSettingKey) {
  const map = useQuery(api.settings.listPublic);

  const html = useMemo(() => {
    const value = map?.[key] ?? DEFAULTS[key];
    return settingValueToHtml(value);
  }, [key, map]);

  return {
    html,
    isLoading: map === undefined,
  };
}
