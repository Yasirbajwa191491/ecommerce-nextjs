"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  DEFAULT_PRIVACY_TIPTAP,
  DEFAULT_RETURN_POLICY,
  DEFAULT_SHIPPING_POLICY,
  DEFAULT_TERMS_TIPTAP,
  type PolicySettingKey,
  settingValueToHtml,
} from "@/lib/legal-content";

const DEFAULTS: Record<PolicySettingKey, string> = {
  terms_conditions: DEFAULT_TERMS_TIPTAP,
  privacy_policy: DEFAULT_PRIVACY_TIPTAP,
  shipping_policy: DEFAULT_SHIPPING_POLICY,
  return_policy: DEFAULT_RETURN_POLICY,
};

export function useLegalPageContent(key: PolicySettingKey) {
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
