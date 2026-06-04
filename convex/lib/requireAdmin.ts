import { ConvexError } from "convex/values";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "../_generated/dataModel";
import { authComponent } from "../betterAuth/auth";
import { isAdminRole, normalizeRole } from "./authRoles";

export type AuthUser = {
  _id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role?: string | null;
  banned?: boolean | null;
};

export async function getAuthUserOrNull(
  ctx: GenericCtx<DataModel>
): Promise<AuthUser | null> {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) return null;
  return user as AuthUser;
}

export async function requireAdmin(ctx: GenericCtx<DataModel>): Promise<AuthUser> {
  const user = await getAuthUserOrNull(ctx);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }
  if (user.banned) {
    throw new ConvexError("Account is banned");
  }
  const role = normalizeRole(user.role);
  if (!isAdminRole(role)) {
    throw new ConvexError(
      `Admin access required. Your account role is "${role}". Ask a super admin to assign the admin role.`
    );
  }
  return user;
}

export async function requireSuperAdmin(
  ctx: GenericCtx<DataModel>
): Promise<AuthUser> {
  const user = await requireAdmin(ctx);
  if (user.role !== "superAdmin") {
    throw new ConvexError("Super admin access required");
  }
  return user;
}
