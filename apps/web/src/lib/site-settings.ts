import { CONTACT_INFO } from "@/lib/site";
import { DEFAULT_STORE_CONTACT, DEFAULT_STORE_NAME } from "@/lib/store-defaults";

export const DEFAULT_SETTINGS = {
  store_name: DEFAULT_STORE_NAME,
  address: CONTACT_INFO.address,
  phone: CONTACT_INFO.phone,
  email: CONTACT_INFO.email,
  business_hours: CONTACT_INFO.hours,
} as const;

export type SiteSettingsMap = Record<string, string>;

export function phoneToHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return `tel:+${digits}`;
}

export function resolveSiteSettings(map?: SiteSettingsMap | null) {
  return {
    storeName: map?.store_name?.trim() || DEFAULT_SETTINGS.store_name,
    address: map?.address ?? DEFAULT_SETTINGS.address,
    phone: map?.phone ?? DEFAULT_SETTINGS.phone,
    phoneHref: phoneToHref(map?.phone ?? DEFAULT_SETTINGS.phone),
    email: map?.email ?? DEFAULT_SETTINGS.email,
    businessHours: map?.business_hours ?? DEFAULT_SETTINGS.business_hours,
    all: { ...DEFAULT_SETTINGS, ...DEFAULT_STORE_CONTACT, ...map },
  };
}
