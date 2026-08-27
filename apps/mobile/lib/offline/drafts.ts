import type { ContactFormValues } from "@/lib/validation/contact-form";
import { getSecureItem, removeSecureItem, setSecureItem } from "@/lib/secure-storage";
import { offlineKeys } from "@/lib/offline/keys";
import { readCache, removeCache, writeCache } from "@/lib/offline/storage";

const CONTACT_DRAFT_KEY = "contactDraft";

export async function loadContactDraft(): Promise<ContactFormValues | null> {
  try {
    const raw = await getSecureItem(CONTACT_DRAFT_KEY);
    if (raw) return JSON.parse(raw) as ContactFormValues;
  } catch {
    // Fall through to legacy cache
  }
  const cached = await readCache<ContactFormValues>(offlineKeys.contactDraft);
  return cached?.data ?? null;
}

export async function saveContactDraft(draft: ContactFormValues): Promise<void> {
  await setSecureItem(CONTACT_DRAFT_KEY, JSON.stringify(draft));
  await removeCache(offlineKeys.contactDraft);
}

export async function clearContactDraft(): Promise<void> {
  await removeSecureItem(CONTACT_DRAFT_KEY);
  await removeCache(offlineKeys.contactDraft);
}

export async function loadNewsletterDraft(): Promise<string | null> {
  const cached = await readCache<string>(offlineKeys.newsletterDraft);
  return cached?.data ?? null;
}

export async function saveNewsletterDraft(email: string): Promise<void> {
  await writeCache(offlineKeys.newsletterDraft, email);
}

export async function clearNewsletterDraft(): Promise<void> {
  await removeCache(offlineKeys.newsletterDraft);
}
