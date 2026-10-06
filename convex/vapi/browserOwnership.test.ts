import { describe, expect, it, vi } from "vitest";

vi.mock("../_generated/server", () => {
  const register = (definition: { handler: unknown }) => ({ _handler: definition.handler });
  return { query: register, mutation: register, internalMutation: register, internalQuery: register };
});
vi.mock("../_generated/api", () => ({
  internal: { vapi: { shoppingTools: { mergeBrowserCartIntoVoice: "merge-cart" } } },
  components: { betterAuth: { adapter: { findMany: "find-users", updateOne: "update-user" } } },
}));
vi.mock("./analyticsHelpers", () => ({ incrementDailyAnalytics: vi.fn(async () => {}) }));
vi.mock("../betterAuth/auth", () => ({ authComponent: {}, createAuth: vi.fn() }));
vi.mock("../lib/requireAdmin", () => ({
  getAuthUserOrNull: vi.fn(async () => ({ _id: "staff-user", email: "staff@example.invalid", role: "user" })),
}));

import { bootstrapSuperAdmin } from "../auth";
import { browserSessionTokenFromWebhook } from "./browserSession";
import { upsertConversation } from "./logging";
import { pushBrowserCartToVoice } from "./voiceCartSync";
import { getLatestPendingCheckout, getPendingCheckoutByCallId } from "./voiceCheckout";
import { getStorefrontSyncForSession } from "./voiceStorefrontSync";

type Row = Record<string, unknown> & { _id: string };
type IndexBuilder = { eq(field: string, value: unknown): IndexBuilder };

function mockContext(initial: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    vapiConversations: [], vapiConversationLogs: [], vapiVoiceCarts: [], ...initial,
  };
  let nextId = 0;
  const db = {
    query(table: string) {
      const filters: Array<[string, unknown]> = [];
      const index: IndexBuilder = { eq(field, value) { filters.push([field, value]); return index; } };
      const matching = () => (tables[table] ?? []).filter((row) => filters.every(([field, value]) => row[field] === value));
      const query = {
        withIndex(_name: string, select: (q: IndexBuilder) => unknown) { select(index); return query; },
        order(_direction: string) { return query; },
        unique: async () => matching()[0] ?? null,
        take: async (count: number) => matching().slice(0, count),
      };
      return query;
    },
    async insert(table: string, fields: Record<string, unknown>) {
      const id = `document-${++nextId}`;
      (tables[table] ??= []).push({ ...fields, _id: id });
      return id;
    },
    async patch(id: string, fields: Record<string, unknown>) {
      const row = Object.values(tables).flat().find((candidate) => candidate._id === id);
      if (!row) throw new Error("Missing test document");
      Object.assign(row, fields);
    },
  };
  const runMutation = vi.fn(async () => ({ updated: true }));
  return { db, tables, runMutation };
}

function invoke(registered: unknown, ctx: unknown, args: unknown): Promise<unknown> {
  const fn = registered as { _handler: (ctx: unknown, args: unknown) => Promise<unknown> };
  return fn._handler(ctx, args);
}

const OWNER = "a".repeat(64);
const OTHER = "b".repeat(64);

function conversation(fields: Record<string, unknown> = {}): Row {
  return {
    _id: "conversation", vapiCallId: "known-call", channel: "voice", startedAt: Date.now(),
    browserSessionToken: OWNER, browserSessionVerifiedAt: Date.now(),
    pendingCheckoutUrl: "https://checkout.example.invalid/owner", pendingOrderNumber: "OWN-1",
    pendingCheckoutAt: Date.now(), ...fields,
  };
}

describe("webhook-established voice ownership", () => {
  it("reads the Web SDK's assistant metadata and supports existing call metadata", () => {
    expect(browserSessionTokenFromWebhook({ assistantOverrides: { metadata: { browserSessionToken: OWNER } } })).toBe(OWNER);
    expect(browserSessionTokenFromWebhook({}, { metadata: { browserSessionToken: OWNER } })).toBe(OWNER);
    expect(browserSessionTokenFromWebhook({ assistant: { metadata: { browserSessionToken: OWNER } } })).toBe(OWNER);
    expect(browserSessionTokenFromWebhook({ metadata: { browserSessionToken: OWNER } })).toBe(OWNER);
    expect(browserSessionTokenFromWebhook({ metadata: { browserSessionToken: "short-token" } })).toBeUndefined();
  });

  it("denies checkout, sync, and cart writes to another browser even with the call id", async () => {
    const ctx = mockContext({ vapiConversations: [conversation()] });
    const proof = { vapiCallId: "known-call", browserSessionToken: OTHER };
    expect(await invoke(getPendingCheckoutByCallId, ctx, proof)).toBeNull();
    expect(await invoke(getLatestPendingCheckout, ctx, { browserSessionToken: OTHER })).toBeNull();
    expect(await invoke(getStorefrontSyncForSession, ctx, proof)).toMatchObject({ resolvedCallId: null, completedTools: [] });
    expect(await invoke(pushBrowserCartToVoice, ctx, { ...proof, lines: [{ productId: "product", color: "black", quantity: 1 }] })).toEqual({ updated: false });
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("does not trust a legacy token established through public first-claim binding", async () => {
    const ctx = mockContext({ vapiConversations: [conversation({ browserSessionToken: OTHER, browserSessionVerifiedAt: undefined })] });
    const proof = { vapiCallId: "known-call", browserSessionToken: OTHER };
    expect(await invoke(getPendingCheckoutByCallId, ctx, proof)).toBeNull();
    expect(await invoke(getLatestPendingCheckout, ctx, { browserSessionToken: OTHER })).toBeNull();
    expect(await invoke(pushBrowserCartToVoice, ctx, { ...proof, lines: [{ productId: "product", color: "", quantity: 1 }] })).toEqual({ updated: false });

    await invoke(upsertConversation, ctx, { vapiCallId: "known-call", channel: "voice", browserSessionToken: OWNER });
    expect(await invoke(getPendingCheckoutByCallId, ctx, proof)).toBeNull();
    expect(await invoke(getPendingCheckoutByCallId, ctx, { ...proof, browserSessionToken: OWNER })).toMatchObject({ orderNumber: "OWN-1" });
    await expect(invoke(upsertConversation, ctx, { vapiCallId: "known-call", channel: "voice", browserSessionToken: OTHER })).rejects.toThrow("verified owner");
  });

  it("resolves the owner's conversation after webhook lag without a browser claim or call id", async () => {
    const ctx = mockContext();
    expect(await invoke(getStorefrontSyncForSession, ctx, { browserSessionToken: OWNER })).toMatchObject({ resolvedCallId: null });
    await invoke(upsertConversation, ctx, { vapiCallId: "new-call", channel: "voice", browserSessionToken: OWNER });
    expect(await invoke(getStorefrontSyncForSession, ctx, { browserSessionToken: OWNER })).toMatchObject({ resolvedCallId: "new-call" });
    expect(await invoke(pushBrowserCartToVoice, ctx, {
      vapiCallId: "new-call", browserSessionToken: OWNER,
      lines: [{ productId: "product", color: "black", quantity: 1 }],
    })).toEqual({ updated: true });
    expect(ctx.runMutation).toHaveBeenCalledWith("merge-cart", {
      conversationId: ctx.tables.vapiConversations[0]?._id,
      lines: [{ productId: "product", color: "black", quantity: 1 }],
    });
  });

  it("selects only the owner's pending checkout", async () => {
    const ctx = mockContext({ vapiConversations: [conversation({ _id: "other", browserSessionToken: OTHER }), conversation()] });
    expect(await invoke(getLatestPendingCheckout, ctx, { browserSessionToken: OWNER })).toMatchObject({ orderNumber: "OWN-1" });
  });
});

describe("administrator bootstrap fails closed", () => {
  it("does not promote a user when the scan cap is reached", async () => {
    let page = 0;
    const runMutation = vi.fn();
    const ctx = { runMutation, runQuery: vi.fn(async () => ({ page: [], isDone: false, continueCursor: `cursor-${++page}` })) };
    await expect(invoke(bootstrapSuperAdmin, ctx, {})).rejects.toThrow("safe limit");
    expect(ctx.runQuery).toHaveBeenCalledTimes(100);
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("does not promote a user when pagination returns malformed data", async () => {
    const ctx = { runMutation: vi.fn(), runQuery: vi.fn(async () => ({ page: [], isDone: false })) };
    await expect(invoke(bootstrapSuperAdmin, ctx, {})).rejects.toThrow("verify administrator setup");
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });

  it("detects an existing super admin after the original first page", async () => {
    let page = 0;
    const ctx = {
      runMutation: vi.fn(), runQuery: vi.fn(async () => (++page === 3
        ? { page: [{ role: "superAdmin" }], isDone: true, continueCursor: "done" }
        : { page: [], isDone: false, continueCursor: `cursor-${page}` })),
    };
    await expect(invoke(bootstrapSuperAdmin, ctx, {})).rejects.toThrow("Admin access required");
    expect(ctx.runMutation).not.toHaveBeenCalled();
  });
});
