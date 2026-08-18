import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

let lastSyncedPath: string | null = null;

export function buildProductsSearchPath(term: string) {
  const trimmed = term.trim();
  return trimmed
    ? `/products?search=${encodeURIComponent(trimmed)}`
    : "/products";
}

export function markSearchUrlSynced(targetPath: string) {
  lastSyncedPath = targetPath;
}

export function resetSearchUrlSync() {
  lastSyncedPath = null;
}

export function syncSearchUrl(
  targetPath: string,
  pathname: string,
  router: AppRouterInstance
) {
  if (lastSyncedPath === targetPath) return;

  if (typeof window !== "undefined") {
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === targetPath) {
      lastSyncedPath = targetPath;
      return;
    }
  }

  lastSyncedPath = targetPath;

  if (pathname === "/products") {
    router.replace(targetPath, { scroll: false });
    return;
  }

  if (targetPath.includes("search=")) {
    router.push(targetPath);
  }
}
