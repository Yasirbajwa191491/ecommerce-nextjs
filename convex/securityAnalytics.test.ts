import { describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { internalMutation } from "./server";
import { backfill } from "./securityAnalytics";
import { getPublicStats } from "./aboutStats";
const fixtures = {
  add: internalMutation({ args: { name: v.string() }, handler: (ctx, args) => ctx.db.insert("productCategories", { name: args.name, slug: args.name, description: "fixture", active: true, sortOrder: 0 }) }),
  active: internalMutation({ args: { id: v.id("productCategories"), active: v.boolean(), fail: v.optional(v.boolean()) }, handler: async (ctx, args) => { await ctx.db.patch(args.id, { active: args.active }); if (args.fail) throw new Error("Fixture rollback"); } }),
};
const modules = {
 "./_generated/api.js": () => import("./_generated/api.js"),
 "./fixtures.ts": async () => fixtures,
 "./securityAnalytics.ts": async () => ({ backfill }),
 "./aboutStats.ts": async () => ({ getPublicStats }),
};
const add = makeFunctionReference<"mutation", {name: string}, Id<"productCategories">>("fixtures:add");
const active = makeFunctionReference<"mutation", {id: Id<"productCategories">; active: boolean; fail?: boolean}>("fixtures:active");
const init = makeFunctionReference<"mutation">("securityAnalytics:backfill");
const stats = makeFunctionReference<"query", Record<string, never>, { productCategories: number } | null>("aboutStats:getPublicStats");
describe("transactional maintained analytics and bounded backfill", () => {
 it("counts concurrent category mutations exactly and never exposes a partial initialization", async () => {
  vi.useFakeTimers();
  try {
   const t = convexTest(schema, modules);
   const ids = [];
   for (let i=0; i<85; i++) ids.push(await t.mutation(add, { name: `category-${i}` }));
   expect(await t.query(stats, {})).toBeNull();
   await t.mutation(init, {});
   await t.finishAllScheduledFunctions(vi.runAllTimers);
   expect(await t.query(stats, {})).toMatchObject({ productCategories: 85 });
   await Promise.all(ids.slice(0,10).map(id => t.mutation(active, { id, active: false })));
   expect(await t.query(stats, {})).toMatchObject({ productCategories: 75 });
   await t.mutation(init, {}); await t.finishAllScheduledFunctions(vi.runAllTimers);
   expect(await t.query(stats, {})).toMatchObject({ productCategories: 75 });
   await expect(t.mutation(active, { id: ids[20], active: false, fail: true })).rejects.toThrow(/rollback/);
   expect(await t.query(stats, {})).toMatchObject({ productCategories: 75 });
  } finally { vi.useRealTimers(); }
 });
});
