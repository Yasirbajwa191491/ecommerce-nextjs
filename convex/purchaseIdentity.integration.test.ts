import { beforeEach, expect, it, vi } from "vitest";
import { verifiedCheckoutUserId } from "./lib/orderAccess";
import { recordPurchaseBehaviorForOrder } from "./recommendationMutations";
vi.mock("./server", async () => vi.importActual("./_generated/server"));
const profiles = vi.hoisted(() => ({ rebuild: vi.fn(), merge: vi.fn() }));
vi.mock("./lib/recommendations/profileBuilder", async importOriginal => ({ ...await importOriginal<typeof import("./lib/recommendations/profileBuilder")>(), rebuildProfileFromSignals: profiles.rebuild, mergeVisitorIntoCustomer: profiles.merge }));
type Row = Record<string, unknown>;
function fixture({ paid = true, verified = false, count = 1 } = {}) {
 const order = { _id: "order:fixture", customerEmail: "owner@example.invalid", userId: verified ? "user:fixture" : undefined, status: "confirmed", paymentStatus: paid ? "paid" : "pending" };
 const events: Row[] = []; const items = Array.from({ length: count }, (_,i) => ({ _id: `item:${i}`, productId: `product:${i}`, isPromotionGift: i === 60 }));
 const db = { get: vi.fn(async () => order), insert: vi.fn(async (_table: string, value: Row) => { events.push(value); return "event:fixture"; }), query: (table: string) => {
   let sourceKey: unknown; const index = { eq: (_field: string, value: unknown) => { sourceKey = value; return index; } };
   const q = { withIndex: (_name: string, filter: (q: typeof index) => unknown) => { filter(index); return q; }, unique: async () => events.find(e => e.sourceKey === sourceKey) ?? null, paginate: async ({numItems,cursor}:{numItems:number;cursor:string|null}) => { const start = Number(cursor ?? 0); return { page: table === "orderItems" ? items.slice(start,start+numItems) : [], isDone: start+numItems>=items.length, continueCursor: String(start+numItems) }; } }; return q;
 }};
 const runQuery = vi.fn(async () => ({ _id: "user:fixture", email: order.customerEmail, emailVerified: true, banned: false }));
 return { ctx: { db, runQuery }, events };
}
const call = (ctx: unknown) => (recordPurchaseBehaviorForOrder as unknown as { _handler: (ctx: unknown, args: {orderId:string}) => Promise<unknown> })._handler(ctx,{orderId:"order:fixture"});
beforeEach(() => { profiles.rebuild.mockReset(); profiles.merge.mockReset(); });
it("binds checkout identity only to a verified matching non-banned session", () => {
 const user = { _id: "user:fixture", email: "owner@example.invalid", emailVerified: true, banned: false };
 expect(verifiedCheckoutUserId(user," Owner@example.invalid ")).toBe(user._id);
 for (const input of [null, {...user,emailVerified:false}, {...user,banned:true}, {...user,email:"other@example.invalid"}]) expect(verifiedCheckoutUserId(input,user.email)).toBeUndefined();
});
it("never promotes a guest checkout email to a customer identity", async () => {
 const f = fixture(); await call(f.ctx);
 expect(f.events).toHaveLength(1); expect(f.events[0].customerKey).toBeUndefined(); expect(f.ctx.runQuery).not.toHaveBeenCalled(); expect(profiles.merge).not.toHaveBeenCalled(); expect(profiles.rebuild).toHaveBeenCalledWith(f.ctx,"visitor","order:order:fixture");
});
it("keeps authoritative verified purchases and deduplicates every bounded line page", async () => {
 const f = fixture({ verified: true, count: 61 }); await call(f.ctx); await call(f.ctx);
 expect(f.events).toHaveLength(60); expect(f.events.every(e => e.customerKey === "owner@example.invalid")).toBe(true); expect(profiles.rebuild).toHaveBeenCalledWith(f.ctx,"customer","owner@example.invalid");
});
it("does not record pending payment behavior", async () => { const f = fixture({paid:false}); await call(f.ctx); expect(f.events).toHaveLength(0); expect(profiles.rebuild).not.toHaveBeenCalled(); });

it.each([
 { _id: "user:fixture", email: "owner@example.invalid", emailVerified: false, banned: false },
 { _id: "user:fixture", email: "owner@example.invalid", emailVerified: true, banned: true },
 { _id: "user:fixture", email: "changed@example.invalid", emailVerified: true, banned: false },
])("refuses stale or revoked order account proof %j", async actor => {
 const f = fixture({verified:true}); f.ctx.runQuery.mockResolvedValue(actor); await call(f.ctx);
 expect(f.events[0].customerKey).toBeUndefined(); expect(profiles.merge).not.toHaveBeenCalled();
});
