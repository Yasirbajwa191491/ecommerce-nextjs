import { paginationOptsValidator } from "convex/server";
import { query } from "./_generated/server";
import { v } from "convex/values";

/** Small catalogs only; prefer listPaginated for production scale (16MB return limit). */
export const list = query({
  args: {},
  handler: async (ctx) =>
    await ctx.db.query("products").order("desc").collect(),
});

export const listPaginated = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) =>
    await ctx.db.query("products").order("desc").paginate(args.paginationOpts),
});

export const getByExternalId = query({
  args: { externalId: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("products")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.externalId))
      .unique(),
});

export const featured = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    return products.slice(0, 6);
  },
});
