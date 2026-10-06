const STORAGE_KEY = "vapiBrowserSession";

export function getVapiBrowserSessionToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing && /^[a-f0-9]{64}$/i.test(existing)) return existing.toLowerCase();
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  window.sessionStorage.setItem(STORAGE_KEY, token);
  return token;
}
