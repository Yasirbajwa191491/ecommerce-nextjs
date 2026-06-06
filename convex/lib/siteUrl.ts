const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  return process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
}
