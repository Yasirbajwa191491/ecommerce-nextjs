const STORAGE_KEY = "vapiBrowserSession";

export function getVapiBrowserSessionToken(): string {
  if (typeof window === "undefined") return "";
  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing && existing.length >= 16) return existing;
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
  window.sessionStorage.setItem(STORAGE_KEY, token);
  return token;
}
