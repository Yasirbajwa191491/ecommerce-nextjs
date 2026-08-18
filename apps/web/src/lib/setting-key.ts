import { slugify } from "@/lib/slugify";

export function normalizeSettingName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function settingKeyFromName(name: string) {
  const key = slugify(normalizeSettingName(name)).replace(/-/g, "_");
  return key || "setting";
}
