import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { getAuthUserOrNull } from "./lib/requireAdmin";
import { isAdminRole, isSuperAdminRole, normalizeRole } from "./lib/authRoles";

async function superAdminExistsInDb(
  ctx: { runQuery: QueryCtx["runQuery"] } | { runQuery: MutationCtx["runQuery"] }
): Promise<boolean> {
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < 100; pageIndex += 1) {
    const result: unknown = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: { numItems: 100, cursor },
    });
    if (typeof result !== "object" || result === null || !("page" in result)) {
      throw new ConvexError("Could not verify administrator setup. Please try again.");
    }
    const page = result.page;
    if (!Array.isArray(page)) {
      throw new ConvexError("Could not verify administrator setup. Please try again.");
    }
    if (
      page.some(
        (user) =>
          typeof user === "object" &&
          user !== null &&
          "role" in user &&
          isSuperAdminRole(typeof user.role === "string" ? user.role : null)
      )
    ) {
      return true;
    }
    if (!("isDone" in result) || typeof result.isDone !== "boolean") {
      throw new ConvexError("Could not verify administrator setup. Please try again.");
    }
    if (result.isDone) return false;
    if (!("continueCursor" in result) || typeof result.continueCursor !== "string") {
      throw new ConvexError("Could not verify administrator setup. Please try again.");
    }
    if (result.continueCursor === cursor) {
      throw new ConvexError("Could not finish checking existing administrators.");
    }
    cursor = result.continueCursor;
  }
  throw new ConvexError("Administrator setup check exceeded its safe limit. Seed an administrator through the configured internal setup.");
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.safeGetAuthUser(ctx);
  },
});

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image ?? null,
      role: normalizeRole(user.role),
    };
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

export const updateMyProfile = mutation({
  args: {
    name: v.string(),
    image: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const name = args.name.trim();
    if (name.length < 2) {
      throw new ConvexError("Name must be at least 2 characters");
    }
    if (name.length > 80) {
      throw new ConvexError("Name must be 80 characters or fewer");
    }
    const image = args.image?.trim() || null;

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateUser({
      body: {
        name,
        image,
      },
      headers,
    });

    return { ok: true };
  },
});

export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) throw new ConvexError("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveProfileImageFromStorage = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) {
      throw new ConvexError("Uploaded image could not be processed");
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.updateUser({
      body: {
        image: imageUrl,
      },
      headers,
    });

    return { ok: true, image: imageUrl };
  },
});

export const changeMyPassword = mutation({
  args: {
    oldPassword: v.string(),
    newPassword: v.string(),
    revokeOtherSessions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUserOrNull(ctx);
    if (!user) throw new ConvexError("Not authenticated");

    if (args.newPassword.length < 8) {
      throw new ConvexError("Password must be at least 8 characters");
    }

    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.oldPassword,
        newPassword: args.newPassword,
        revokeOtherSessions: args.revokeOtherSessions ?? false,
      },
      headers,
    });

    return { ok: true };
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
