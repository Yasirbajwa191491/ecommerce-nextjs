import type { ContactFormValues } from "@/lib/validation/contact-form";
import { offlineKeys } from "@/lib/offline/keys";
import { readCache, removeCache, writeCache } from "@/lib/offline/storage";

export async function loadContactDraft(): Promise<ContactFormValues | null> {
  const cached = await readCache<ContactFormValues>(offlineKeys.contactDraft);
  return cached?.data ?? null;
}

export async function saveContactDraft(draft: ContactFormValues): Promise<void> {
  await writeCache(offlineKeys.contactDraft, draft);
}

export async function clearContactDraft(): Promise<void> {
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
