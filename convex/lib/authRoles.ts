export const ADMIN_ROLES = new Set(["admin", "superAdmin"]);

export function normalizeRole(role: string | null | undefined): string {
  return role ?? "user";
}

export function isAdminRole(role: string | null | undefined): boolean {
  return ADMIN_ROLES.has(normalizeRole(role));
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  return normalizeRole(role) === "superAdmin";
}
