import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ user: { _id: "user:1", email: "owner@example.invalid", emailVerified: true, role: "user", banned: false }, setRole: vi.fn() }));
vi.mock("./betterAuth/auth", () => ({ authComponent: { safeGetAuthUser: async () => auth.user, getAuth: async () => ({ auth: { api: { setRole: auth.setRole } }, headers: new Headers() }) }, createAuth: vi.fn() }));
vi.mock("./server", async () => vi.importActual("./_generated/server"));
import { bootstrapSuperAdmin } from "./auth";
import { setRole } from "./adminUsers";
import { hasOrderAccess } from "./lib/orderAccess";
import { validateSeedCredentials } from "./lib/seedCredentials";
import { tokenHash } from "./lib/capabilities";
import { createChallenge, consume } from "./orderRecovery";
import { exportBehavioralEvents } from "./mlBehavioralHttp";
import { createApprovedDraft } from "./agentInternal";
import { createPendingApproval, argumentsMatchApproval } from "./lib/agents/approvals";
import { serializeAgentPayload } from "./lib/agents/serialization";
import { reserveRag } from "./aiUsage";
import { issue } from "./guestIdentity";
import { listWishlistProductIds } from "./recommendationQueries";
import { toggleWishlistItem, recordRecommendationInteraction } from "./recommendationMutations";
import { pageSalesLines, beginPublication, addForecastRows, finishPublication } from "./forecastData";
import { fillSalesDays } from "./lib/forecasting/eligibility";
import { validateRagGrounding } from "./lib/rag/grounding";
import { validateImageUrl, publicAddress, validateImageBytes } from "../apps/web/src/lib/ai/image-embedding/secure-input";
import { getRun } from "./agents";
import { cancelOrder } from "./orders";
import { reconcileOrder } from "./recommendationAttribution";
import { prepareRagPayload } from "./ragIndexing";
import prepareFixture from "../tests/contracts/rag-prepare.json";
import { exactBoundedRead } from "./lib/boundedRead";

type Row = Record<string, unknown> & { _id: string; _creationTime: number };
class DB {
 tables: Record<string, Row[]> = {}; sequence = 0;
 async insert(table: string, values: Record<string, unknown>) { const _id = `${table}:${++this.sequence}`; (this.tables[table] ??= []).push({ _id, _creationTime: this.sequence, ...values }); return _id; }
 async get(id: string) { return Object.values(this.tables).flat().find(r => r._id === id) ?? null; }
 async patch(id: string, values: Record<string, unknown>) { Object.assign((await this.get(id))!, values); }
 query(table: string) {
  const filters: ((r: Row) => boolean)[] = [];
  const rows = () => (this.tables[table] ?? []).filter(r => filters.every(f => f(r)));
  const index = { eq: (field: string, value: unknown) => { filters.push(r => r[field] === value); return index; }, lte: (field: string, value: number) => { filters.push(r => Number(r[field]) <= value); return index; }, gte: (field: string, value: number) => { filters.push(r => Number(r[field]) >= value); return index; } };
  const q = { withIndex: (_: string, fn?: (q: typeof index) => unknown) => { fn?.(index); return q; },
   filter: (_: unknown) => q, order: (_: unknown) => q,
   take: async (n: number) => rows().slice(0, n), unique: async () => { const r = rows(); if (r.length > 1) throw new Error("Not unique"); return r[0] ?? null; },
   first: async () => rows()[0] ?? null,
   paginate: async ({ numItems, cursor }: {numItems: number; cursor: string | null}) => { const offset = Number(cursor ?? 0); return { page: rows().slice(offset, offset + numItems), continueCursor: String(offset + numItems), isDone: offset + numItems >= rows().length }; },
  }; return q;
 }
}
function call<T = unknown>(fn: unknown, ctx: unknown, args: unknown = {}): Promise<T> { return (fn as { _handler: (ctx: unknown, args: unknown) => Promise<T> })._handler(ctx, args); }
function context(db = new DB()) { return { db, scheduler: { runAfter: vi.fn() }, runQuery: vi.fn(async () => auth.user) }; }
beforeEach(() => { vi.unstubAllEnvs(); auth.user.role = "user"; auth.user.banned = false; auth.setRole.mockClear(); });

describe("administrator and guest ownership regressions", () => {
 it("denies first-user bootstrap even in an empty deployment", async () => { await expect(call(bootstrapSuperAdmin, context())).rejects.toThrow(/operator/); });
 it("denies admin self-promotion and allows a super-admin", async () => {
  auth.user.role = "admin"; await expect(call(setRole, context(), { userId: "user:1", role: "superAdmin" })).rejects.toThrow(/Super admin/);
  expect(auth.setRole).not.toHaveBeenCalled(); auth.user.role = "superAdmin";
  await call(setRole, context(), { userId: "user:2", role: "admin" }); expect(auth.setRole).toHaveBeenCalledOnce();
 });
 it("rejects missing/weak seed credentials and accepts an explicit strong replacement", () => {
  expect(() => validateSeedCredentials(undefined, undefined)).toThrow(); expect(() => validateSeedCredentials("x@example.invalid", "password-placeholder")).toThrow();
  expect(validateSeedCredentials("Owner@example.invalid", "unique-fixture-passphrase-2026").email).toBe("owner@example.invalid");
 });
 it("rejects email, phone, missing and wrong tokens but accepts the order capability", () => {
  const order = { customerEmail: "owner@example.invalid", accessToken: "fixture-owner-capability" } as Parameters<typeof hasOrderAccess>[0];
  expect(hasOrderAccess(order, { customerEmail: order.customerEmail })).toBe(false);
  expect(hasOrderAccess(order, {})).toBe(false); expect(hasOrderAccess(order, { accessToken: "wrong" })).toBe(false);
  expect(hasOrderAccess(order, { accessToken: order.accessToken })).toBe(true);
 });
 it("recovery enforces expiry, attempt limits, exact code and single-use issuance", async () => {
  const ctx = context(), email = "owner@example.invalid"; await ctx.db.insert("orders", { orderNumber: "ORDER", customerEmail: email });
  await call(createChallenge, ctx, { email, orderNumber: "ORDER", challengeHash: "fixture-hash", otpHash: "correct-code-hash" });
  expect(await call(consume, ctx, { challengeHash: "fixture-hash", otpHash: "wrong" })).toBeNull();
  const result = await call<{accessToken: string}>(consume, ctx, { challengeHash: "fixture-hash", otpHash: "correct-code-hash" });
  expect(result.accessToken).toMatch(/^[a-f0-9]{64}$/); expect(await call(consume, ctx, { challengeHash: "fixture-hash", otpHash: "correct-code-hash" })).toBeNull();
  await ctx.db.insert("orderRecoveryChallenges", { challengeHash: "expired", expiresAt: 0, attempts: 0, consumed: false });
  expect(await call(consume, ctx, { challengeHash: "expired", otpHash: "any" })).toBeNull();
 });
 it("does not create recovery challenges for guessed order/contact combinations", async () => {
  const ctx = context(); expect(await call(createChallenge, ctx, { email: "unknown@example.invalid", orderNumber: "unknown", challengeHash: "x", otpHash: "x" })).toBe(false);
  expect(ctx.db.tables.orderRecoveryChallenges).toBeUndefined();
 });
 it("scopes wishlist reads and writes to server-issued guest capabilities", async () => {
  const ctx = context(); const visitorId = await call<string>(issue, ctx);
  await call(toggleWishlistItem, ctx, { visitorId, productId: "products:fixture", add: true, customerEmail: "victim@example.invalid" });
  expect(await call(listWishlistProductIds, ctx, { visitorId, customerEmail: "victim@example.invalid" })).toEqual(["products:fixture"]);
  const other = await call<string>(issue, ctx); expect(await call(listWishlistProductIds, ctx, { visitorId: other })).toEqual([]);
  await expect(call(listWishlistProductIds, ctx, { visitorId: "caller-chosen-id", customerEmail: "victim@example.invalid" })).rejects.toThrow();
 });
 it("rejects fabricated revenue and conversion before any analytics writes", async () => {
  const ctx = context(); await expect(call(recordRecommendationInteraction, ctx, { eventType: "conversion", revenue: 1000000 })).rejects.toThrow(/verified paid orders/);
  await expect(call(recordRecommendationInteraction, ctx, { eventType: "click", revenue: -100 })).rejects.toThrow();
  expect(ctx.db.tables.recommendationEvents).toBeUndefined();
 });
});

describe("AI budgets, exports and approval write fences", () => {
 it("requires guest possession and atomically reserves each caller/global RAG allowance", async () => {
  const ctx = context(); await expect(call(reserveRag, ctx, { guest: "" })).rejects.toThrow();
  const guest = await call<string>(issue, ctx); const owner = await call<string>(reserveRag, ctx, { guest }); expect(owner).toBe(await tokenHash(guest));
  for (let n = 1; n < 30; n++) await call(reserveRag, ctx, { guest });
  await expect(call(reserveRag, ctx, { guest })).rejects.toThrow(/usage limit/);
  const global = ctx.db.tables.trackingRateLimits.find(r => r.bucketKey === "ai:rag:global")!; global.attemptCount = 500;
  const rotated = await call<string>(issue, ctx); await expect(call(reserveRag, ctx, { guest: rotated })).rejects.toThrow(/usage limit/);
 });
 it.each([undefined, "false"])("denies export with gate %s before any data query", async flag => {
  if (flag) vi.stubEnv("BEHAVIORAL_EXPORT_ENABLED", flag); const ctx = { runQuery: vi.fn() };
  const response = await call<Response>(exportBehavioralEvents, ctx, new Request("https://fixture.invalid/?kind=behavior"));
  expect(response.status).toBe(503); expect(ctx.runQuery).not.toHaveBeenCalled();
 });
 it("allows a gated authenticated export and rejects a wrong bearer", async () => {
  vi.stubEnv("BEHAVIORAL_EXPORT_ENABLED", "true"); vi.stubEnv("BEHAVIORAL_EXPORT_TOKEN", "synthetic-fixture-export-token"); vi.stubEnv("BEHAVIORAL_EXPORT_SALT", "synthetic-fixture-salt");
  const ctx = { runQuery: vi.fn(async () => ({ events: [], isDone: true, continueCursor: "" })) };
  expect((await call<Response>(exportBehavioralEvents, ctx, new Request("https://fixture.invalid/?kind=behavior", { headers: { Authorization: "Bearer synthetic-fixture-export-token" } }))).status).toBe(200);
  expect((await call<Response>(exportBehavioralEvents, ctx, new Request("https://fixture.invalid/?kind=behavior", { headers: { Authorization: "Bearer wrong" } }))).status).toBe(401);
 });
 const payload = { title: "Fixture draft", subject: "Fixture subject", body: "This is fixture text", productIds: [], promotionExplanation: "No sale", rationale: "Fixture purpose" };
 async function draftContext() {
  vi.stubEnv("AGENTIC_AI_ENABLED", "true"); vi.stubEnv("AGENTIC_AI_DRAFT_WRITES_ENABLED", "true"); auth.user.role = "admin";
  const ctx = context(); const runId = await ctx.db.insert("agentRuns", { status: "resuming", expiresAt: Date.now() + 60000, version: 8, leaseOwner: "worker", leaseUntil: Date.now() + 30000, draftWritesEnabled: true, requireDraftApproval: true, adminUserId: auth.user._id, adminName: "Fixture" });
  for (const key of ["enable_agentic_ai", "enable_agent_draft_creation"]) await ctx.db.insert("settings", { key, value: "true" });
  const approval = createPendingApproval({ id: "fixture-approval", stepIndex: 0, toolName: "create_marketing_campaign_draft", args: payload, summary: "fixture", requestedBy: auth.user._id, now: Date.now() });
  await ctx.db.insert("agentApprovals", { ...approval, approvalKey: approval.id, runId, argumentsJson: JSON.stringify(payload), status: "approved" });
  return { ctx, args: { runId, expectedVersion: 8, leaseOwner: "worker", idempotencyKey: approval.idempotencyKey, ...payload } };
 }
 it.each(["cancelled", "expired", "completed"])("refuses an approved draft from a %s run", async status => { const { ctx, args } = await draftContext(); await ctx.db.patch(args.runId, { status }); expect(await call(createApprovedDraft, ctx, args)).toMatchObject({ available: false }); expect(ctx.db.tables.emailCampaigns).toBeUndefined(); });
 it("refuses stale leases, role revocation, changed payload and disabled gates", async () => {
  for (const condition of ["lease", "role", "args", "gate"]) {
   const { ctx, args } = await draftContext();
   if (condition === "lease") args.expectedVersion = 7;
   if (condition === "role") auth.user.role = "user";
   if (condition === "args") args.body = "Changed draft content";
   if (condition === "gate") vi.stubEnv("AGENTIC_AI_DRAFT_WRITES_ENABLED", "false");
   expect(await call(createApprovedDraft, ctx, args)).toMatchObject({ available: false }); expect(ctx.db.tables.emailCampaigns).toBeUndefined();
  }
 });
 it("writes one valid approved draft and deduplicates replay", async () => { const { ctx, args } = await draftContext(); expect(await call(createApprovedDraft, ctx, args)).toMatchObject({ available: true }); await call(createApprovedDraft, ctx, args); expect(ctx.db.tables.emailCampaigns).toHaveLength(1); });
 it("round-trips escaped/Unicode approval JSON and rejects oversized bytes", () => {
  const args = { body: '"\\\n'.repeat(4000), title: "商品".repeat(30) }; expect(JSON.parse(serializeAgentPayload(args))).toEqual(args);
  expect(() => serializeAgentPayload({ text: "界".repeat(30000) })).toThrow(/storage limit/);
  const approval = createPendingApproval({ id: "a", stepIndex: 0, toolName: "draft", args, summary: "fixture", requestedBy: "admin", now: 1 });
  expect(argumentsMatchApproval(approval, "draft", args)).toBe(true); expect(argumentsMatchApproval(approval, "draft", { ...args, body: "modified" })).toBe(false);
 });
});

describe("image and forecasting regression boundaries", () => {
 it.each(["http://images.example.invalid/a", "https://127.0.0.1/a", "https://metadata.google.internal/a", "file:///tmp/a", "https://u:p@images.example.invalid/a", "https://images.example.invalid:8443/a"])("rejects unapproved image source %s", url => { expect(() => validateImageUrl(url, ["https://images.example.invalid"])).toThrow(); });
 it.each(["127.0.0.1", "10.0.0.1", "169.254.169.254", "172.16.2.3", "192.168.1.1", "::1", "::ffff:127.0.0.1", "fe80::1", "ff02::1"])("rejects private/reserved DNS answer %s", ip => expect(publicAddress(ip)).toBe(false));
 it("allows approved HTTPS and bounded supported images", () => { expect(validateImageUrl("https://images.example.invalid/a", ["https://images.example.invalid"]).hostname).toBe("images.example.invalid"); expect(publicAddress("8.8.8.8")).toBe(true); expect(() => validateImageBytes(new Uint8Array(1), "image/png")).not.toThrow(); expect(() => validateImageBytes(new Uint8Array(6*1024*1024), "image/png")).toThrow(); expect(() => validateImageBytes(new Uint8Array(1), "text/html")).toThrow(); });
 it("rejects swapped multi-product claims and accepts a correct single-product claim", () => {
  const facts = [{ productId: "A", price: 10, finalPrice: 10, stock: 0, available: false }, { productId: "B", price: 20, finalPrice: 20, stock: 2, available: true }];
  const chunks = [{ chunkId: "a", productId: "A" }, { chunkId: "b", productId: "B" }];
  expect(validateRagGrounding({ answer: "A costs $20. B costs $10. Both are in stock.", facts, chunks, citationIds: ["a", "b"], mode: "strict" }).grounded).toBe(false);
  expect(validateRagGrounding({ answer: "B costs $20 and is in stock.", facts, chunks, citationIds: ["b"], mode: "strict" }).grounded).toBe(true);
 });
 it("rejects a symbol currency mismatch and spaced unsupported prices", () => {
  const facts = [{ productId: "one", currency: "USD", price: 10, finalPrice: 10, stock: 5, available: true }];
  for (const answer of ["It costs €10 [one]", "It costs $ 999 [one]"]) {
   expect(validateRagGrounding({ answer, citationIds: ["one"], chunks: [{ chunkId: "one", productId: "one" }], facts, mode: "strict" }).grounded).toBe(false);
  }
 });
 it("preserves the latest sale in a long bounded calendar", () => { const sales = new Map([["2026-01-01", { units: 1, orders: new Set(["a"]) }], ["2026-10-01", { units: 9, orders: new Set(["b"]) }]]); const rows = fillSalesDays(sales, "2026-01-01", "2026-10-01"); expect(rows).toHaveLength(180); expect(rows.at(-1)).toMatchObject({ date: "2026-10-01", units: 9 }); });
 it("exports every paid order line beyond forty through bounded pages", async () => {
  vi.stubEnv("DEMAND_FORECAST_EXPORT_ENABLED", "true"); const ctx = context();
  const orderId = await ctx.db.insert("orders", { status: "delivered", paymentStatus: "paid", paymentMethod: "stripe", createdAt: 1 });
  const productId = await ctx.db.insert("products", { active: true, stock: 5 });
  for (let n=0; n<100; n++) await ctx.db.insert("orderItems", { orderId, productId, quantity: 1, isPromotionGift: n===0 });
  let cursor: string | null = null; const lines: unknown[] = [];
  for (;;) { const page: { lines: unknown[]; isDone: boolean; continueCursor: string } = await call<{ lines: unknown[]; isDone: boolean; continueCursor: string }>(pageSalesLines, ctx, { cursor, cutoff: Date.now() }); expect(page.lines.length).toBeLessThanOrEqual(25); lines.push(...page.lines); if (page.isDone) break; cursor=page.continueCursor; }
  expect(lines).toHaveLength(99);
 });
 it("stages incomplete forecasts without replacing the previous publication", async () => {
  const ctx = context(); const previousId = await ctx.db.insert("forecastPublications", { publicationId: "previous", status: "published" });
  await call(beginPublication, ctx, { publicationId: "new" }); expect((await ctx.db.get(previousId))?.status).toBe("published");
  await expect(call(finishPublication, ctx, { publicationId: "new", pointCount: 1, insightCount: 0 })).rejects.toThrow(/incomplete/);
  await call(addForecastRows, ctx, { publicationId: "new", batchKey: "batch1", points: [{ entityId: "x" }], insights: [] });
  await call(addForecastRows, ctx, { publicationId: "new", batchKey: "batch1", points: [{ entityId: "x" }], insights: [] }); expect(ctx.db.tables.forecastPoints).toHaveLength(1);
  await call(finishPublication, ctx, { publicationId: "new", pointCount: 1, insightCount: 0 }); expect((await ctx.db.get(previousId))?.status).toBe("archived");
 });
 it("never returns silently truncated exact query results", async () => { await expect(exactBoundedRead({ take: async () => [1, 2, 3] }, 2)).rejects.toThrow(/No partial/); expect(await exactBoundedRead({ take: async () => [1, 2] }, 2)).toEqual([1, 2]); });
});

describe("cross-service and financial integration boundaries", () => {
 it("constructs the exact Python prepare contract without index-only fields", () => {
  expect(prepareRagPayload({ ...prepareFixture, policies: prepareFixture.policies, embedding_mode: "provided", embedding_version: "fixture", prune_document_ids: ["old"] })).toEqual(prepareFixture);
 });
 it("does not schedule a cancellation or refund when only an email is supplied", async () => {
  const ctx = context(); await ctx.db.insert("orders", { orderNumber: "ORDER", customerEmail: "victim@example.invalid", accessToken: "private-fixture-token" });
  expect(await call(cancelOrder, ctx, { orderNumber: "ORDER", customerEmail: "victim@example.invalid" })).toMatchObject({ success: false });
  expect(ctx.scheduler.runAfter).not.toHaveBeenCalled();
 });
 it("attributes only paid prior clicks, deduplicates variants/replays, and reverses refunded revenue", async () => {
  const ctx = context(), now = Date.now();
  const orderId = await ctx.db.insert("orders", { customerEmail: "owner@example.invalid", paymentStatus: "pending", status: "processing", createdAt: now, paidAt: now });
  const productId = "products:fixture";
  await ctx.db.insert("orderItems", { orderId, productId, lineTotal: 10 }); await ctx.db.insert("orderItems", { orderId, productId, lineTotal: 20 });
  await ctx.db.insert("recommendationEvents", { eventType: "click", customerKey: "owner@example.invalid", productId, sectionType: "recommended_for_you", source: "personalized", occurredAt: now - 1 });
  await call(reconcileOrder, ctx, { orderId }); expect(ctx.db.tables.recommendationAnalytics).toBeUndefined();
  await ctx.db.patch(orderId, { paymentStatus: "paid" }); await call(reconcileOrder, ctx, { orderId }); await call(reconcileOrder, ctx, { orderId });
  expect(ctx.db.tables.recommendationAnalytics[0]).toMatchObject({ conversions: 1, revenue: 30 });
  await ctx.db.patch(orderId, { paymentStatus: "refunded" }); await call(reconcileOrder, ctx, { orderId }); await call(reconcileOrder, ctx, { orderId });
  expect(ctx.db.tables.recommendationAnalytics[0]).toMatchObject({ conversions: 1, revenue: 0 });
 });
 it("returns the immutable normalized draft body in the owner's approval DTO", async () => {
  auth.user.role = "admin"; const ctx = context();
  const runId = await ctx.db.insert("agentRuns", { adminUserId: auth.user._id, request: "fixture", status: "waiting_for_approval", recommendationsJson: "[]" });
  await ctx.db.insert("agentApprovals", { runId, approvalKey: "fixture", argumentsJson: JSON.stringify({ title: "Exact title", subject: "Exact subject", body: "Exact body", productIds: ["products:1"], promotionExplanation: "Exact promotion", rationale: "Exact rationale" }) });
  const result = await call<{approvals: {arguments: Record<string, unknown>}[]}>(getRun, ctx, { runId });
  expect(result.approvals[0].arguments).toMatchObject({ body: "Exact body", subject: "Exact subject", productIds: ["products:1"] });
 });
});
