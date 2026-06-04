import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { authComponent } from "./betterAuth/auth";
import { getAuthUserOrNull } from "./lib/requireAdmin";
import { isAdminRole, isSuperAdminRole, normalizeRole } from "./lib/authRoles";

type BetterAuthUser = {
  _id: string;
  email: string;
  name: string;
  role?: string | null;
};

async function superAdminExistsInDb(
  ctx: { runQuery: QueryCtx["runQuery"] } | { runQuery: MutationCtx["runQuery"] }
): Promise<boolean> {
  const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
    model: "user",
    paginationOpts: { numItems: 200, cursor: null },
  });
  return (result.page as BetterAuthUser[]).some((u) =>
    isSuperAdminRole(u.role)
  );
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getSessionInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) {
      return { authenticated: false as const };
    }
    const role = normalizeRole(user.role);
    return {
      authenticated: true as const,
      email: user.email,
      name: user.name,
      role,
      isAdmin: isAdminRole(role),
      isSuperAdmin: isSuperAdminRole(role),
    };
  },
});

export const hasSuperAdmin = query({
  args: {},
  handler: async (ctx) => {
    return await superAdminExistsInDb(ctx);
  },
});

/** First signed-in user can become super admin when none exists yet (e.g. seed not run). */
export const bootstrapSuperAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) {
      throw new ConvexError("Not authenticated");
    }
    if (isAdminRole(user.role)) {
      return { ok: true, role: normalizeRole(user.role), bootstrapped: false };
    }
    if (await superAdminExistsInDb(ctx)) {
      throw new ConvexError(
        `Admin access required. Your account role is "${normalizeRole(user.role)}". Sign in with a super admin account or ask one to assign you the admin role.`
      );
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "user",
        where: [{ field: "_id", value: user._id }],
        update: {
          role: "superAdmin",
          emailVerified: true,
          updatedAt: Date.now(),
        },
      },
    });

    return { ok: true, role: "superAdmin", bootstrapped: true };
  },
});
