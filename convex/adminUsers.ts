import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { components } from "./_generated/api";
import { authComponent, createAuth } from "./betterAuth/auth";
import { requireAdmin, requireSuperAdmin } from "./lib/requireAdmin";

export const listPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const result = await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: "user",
      paginationOpts: args.paginationOpts,
      sortBy: { field: "createdAt", direction: "desc" },
    });

    if (!args.search?.trim()) {
      return result;
    }

    const term = args.search.trim().toLowerCase();
    return {
      ...result,
      page: result.page.filter(
        (u: { email?: string; name?: string }) =>
          u.email?.toLowerCase().includes(term) ||
          u.name?.toLowerCase().includes(term)
      ),
    };
  },
});

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("superAdmin")),
  },
  handler: async (ctx, args) => {
    const current = await requireAdmin(ctx);
    if (args.role !== "user" && current.role !== "superAdmin") {
      throw new ConvexError("Only super admins can assign admin roles");
    }
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.createUser({
      body: {
        email: args.email,
        password: args.password,
        name: args.name,
        role: args.role,
        data: { emailVerified: true },
      },
      headers,
    });
  },
});

export const setRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("superAdmin")),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.setRole({
      body: { userId: args.userId, role: args.role },
      headers,
    });
  },
});

export const banUser = mutation({
  args: {
    userId: v.string(),
    banReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.banUser({
      body: { userId: args.userId, banReason: args.banReason },
      headers,
    });
  },
});

export const unbanUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.unbanUser({
      body: { userId: args.userId },
      headers,
    });
  },
});

export const removeUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireSuperAdmin(ctx);
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.removeUser({
      body: { userId: args.userId },
      headers,
    });
  },
});
