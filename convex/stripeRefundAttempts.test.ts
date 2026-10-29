vi.mock("./server", async () => vi.importActual("./_generated/server"));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
import type { FunctionReference } from "convex/server";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import * as attempts from "./stripeRefundAttempts";
import { refundUnfulfillablePayment, retryDueStripeRefunds } from "./stripe";
import { STRIPE_REFUND_LEASE_MS } from "./lib/stripeRefundRetry";

const stripeCalls = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  retrieve: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class {
    refunds = stripeCalls;
  },
}));

type Attempt = Doc<"stripeRefundAttempts">;
type RefundArgs = {
  orderId: Id<"orders">;
  paymentIntentId: string;
  reason: string;
  amountCents?: number;
  feePercent?: number;
};
type ControlledRefund = {
  id: string;
  status: "pending" | "succeeded";
  metadata: Record<string, string>;
};
type Handler<Ctx, Args, Result> = (ctx: Ctx, args: Args) => Promise<Result>;

function handler<Ctx, Args, Result>(registration: unknown): Handler<Ctx, Args, Result> {
  return (registration as { _handler: Handler<Ctx, Args, Result> })._handler;
}

const mutationHandlers = new Map<string, Handler<MutationCtx, Record<string, unknown>, unknown>>([
  ["enqueueStripeRefundAttempt", handler(attempts.enqueueStripeRefundAttempt)],
  ["claimStripeRefundAttempt", handler(attempts.claimStripeRefundAttempt)],
  ["recordStripeRefundResult", handler(attempts.recordStripeRefundResult)],
  ["completeStripeRefundAttempt", handler(attempts.completeStripeRefundAttempt)],
  ["deferStripeRefundAttempt", handler(attempts.deferStripeRefundAttempt)],
]);

/** Executes the real refund handlers with serializable, rollback-capable database transactions. */
function createHarness() {
  let rows = new Map<Id<"stripeRefundAttempts">, Attempt>();
  let orderStatus = "cancelled";
  let transactionTail: Promise<unknown> = Promise.resolve();
  let sequence = 0;
  const faults = { record: 0, reconcile: 0, completionPatch: 0, workerPayment: "" };

  type Condition = { field: string; operation: "eq" | "lte"; value: unknown };
  type RangeBuilder = {
    eq: (field: string, value: unknown) => RangeBuilder;
    lte: (field: string, value: unknown) => RangeBuilder;
  };
  const db = {
    get: async (id: Id<"stripeRefundAttempts">) => structuredClone(rows.get(id) ?? null),
    insert: async (_table: string, fields: Omit<Attempt, "_id" | "_creationTime">) => {
      const id = `refund_${++sequence}` as Id<"stripeRefundAttempts">;
      rows.set(id, { ...structuredClone(fields), _id: id, _creationTime: Date.now() });
      return id;
    },
    patch: async (id: Id<"stripeRefundAttempts">, fields: Partial<Attempt>) => {
      if (fields.status === "succeeded" && faults.completionPatch > 0) {
        faults.completionPatch -= 1;
        throw new Error("completion write interrupted");
      }
      const existing = rows.get(id);
      if (!existing) throw new Error("missing attempt");
      rows.set(id, { ...existing, ...structuredClone(fields) });
    },
    query: () => ({
      withIndex: (_name: string, range: (builder: RangeBuilder) => RangeBuilder) => {
        const conditions: Condition[] = [];
        const builder: RangeBuilder = {
          eq: (field, value) => {
            conditions.push({ field, value, operation: "eq" });
            return builder;
          },
          lte: (field, value) => {
            conditions.push({ field, value, operation: "lte" });
            return builder;
          },
        };
        range(builder);
        const matching = () => [...rows.values()]
          .filter((row) => conditions.every((condition) => {
            const value = (row as unknown as Record<string, unknown>)[condition.field];
            return condition.operation === "eq"
              ? value === condition.value
              : typeof value === "number" && typeof condition.value === "number" && value <= condition.value;
          }))
          .sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);
        return {
          unique: async () => structuredClone(matching()[0] ?? null),
          take: async (limit: number) => structuredClone(matching().slice(0, limit)),
        };
      },
    }),
  };

  const mutationCtx = {
    db,
    runMutation: async (reference: FunctionReference<"mutation">) => {
      expect(getFunctionName(reference)).toBe("orders:markOrderRefunded");
      orderStatus = "refunded";
      if (faults.reconcile > 0) {
        faults.reconcile -= 1;
        throw new Error("order reconciliation interrupted");
      }
      return { success: true, alreadyRefunded: false };
    },
  } as unknown as MutationCtx;

  const mutate = (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const result = transactionTail.then(async () => {
      const snapshot = structuredClone(rows);
      const previousOrderStatus = orderStatus;
      try {
        if (name === "recordStripeRefundResult" && faults.record > 0) {
          faults.record -= 1;
          throw new Error("worker interrupted before saving Stripe outcome");
        }
        const operation = mutationHandlers.get(name);
        if (!operation) throw new Error(`unexpected mutation ${name}`);
        return await operation(mutationCtx, args);
      } catch (error) {
        rows = snapshot;
        orderStatus = previousOrderStatus;
        throw error;
      }
    });
    transactionTail = result.catch(() => undefined);
    return result;
  };

  const query = async (name: string, args: Record<string, unknown>): Promise<unknown> => {
    const registration = name === "listDueStripeRefunds"
      ? attempts.listDueStripeRefunds
      : attempts.getStripeRefundAttempt;
    return await handler<QueryCtx, Record<string, unknown>, unknown>(registration)(
      { db } as unknown as QueryCtx,
      args
    );
  };
  const actionCtx = {
    runMutation: async (reference: FunctionReference<"mutation">, args: Record<string, unknown>) => {
      const name = getFunctionName(reference).split(":")[1]!;
      if (name === "recordStripeRefundFailure") return null;
      return await mutate(name, args);
    },
    runQuery: async (reference: FunctionReference<"query">, args: Record<string, unknown>) =>
      await query(getFunctionName(reference).split(":")[1]!, args),
    runAction: async (_reference: FunctionReference<"action">, args: RefundArgs) => {
      if (args.paymentIntentId === faults.workerPayment) throw new Error("worker unavailable");
      return await handler<ActionCtx, RefundArgs, null>(refundUnfulfillablePayment)(actionCtx, args);
    },
  } as unknown as ActionCtx;

  return {
    faults,
    mutate,
    query,
    run: (args: RefundArgs) => handler<ActionCtx, RefundArgs, null>(refundUnfulfillablePayment)(actionCtx, args),
    cron: () => handler<ActionCtx, Record<string, never>, null>(retryDueStripeRefunds)(actionCtx, {}),
    attempts: () => [...rows.values()],
    orderStatus: () => orderStatus,
  };
}

const payload: RefundArgs = {
  orderId: "order_1" as Id<"orders">,
  paymentIntentId: "pi_1",
  reason: "customer_cancelled",
  amountCents: 2500,
  feePercent: 5,
};
let externalRefunds: Map<string, ControlledRefund>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_controlled");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.clearAllMocks();
  externalRefunds = new Map();
  stripeCalls.create.mockImplementation(async (
    params: { metadata: Record<string, string> },
    options: { idempotencyKey: string }
  ) => {
    const existing = externalRefunds.get(options.idempotencyKey);
    if (existing) return existing;
    const refund: ControlledRefund = {
      id: `re_${externalRefunds.size + 1}`,
      status: "succeeded",
      metadata: params.metadata,
    };
    externalRefunds.set(options.idempotencyKey, refund);
    return refund;
  });
  stripeCalls.list.mockImplementation(async () => ({ data: [...externalRefunds.values()], has_more: false }));
  stripeCalls.retrieve.mockImplementation(async (id: string) =>
    [...externalRefunds.values()].find((refund) => refund.id === id));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("durable Stripe refund handlers", () => {
  it("rediscovers an interrupted processing lease and finishes it through the cron", async () => {
    const harness = createHarness();
    const attemptId = await harness.mutate("enqueueStripeRefundAttempt", payload);
    await harness.mutate("claimStripeRefundAttempt", { attemptId });
    expect(await harness.query("listDueStripeRefunds", { now: Date.now() })).toEqual([]);
    vi.setSystemTime(Date.now() + STRIPE_REFUND_LEASE_MS + 1);
    expect(await harness.query("listDueStripeRefunds", { now: Date.now() })).toEqual([attemptId]);
    await harness.cron();
    expect(harness.attempts()[0]).toMatchObject({ status: "succeeded", leaseVersion: 2 });
    expect(harness.orderStatus()).toBe("refunded");
    expect(stripeCalls.create).toHaveBeenCalledTimes(1);
  });

  it("prevents a stale worker from deferring or completing a newer lease", async () => {
    const harness = createHarness();
    const attemptId = await harness.mutate("enqueueStripeRefundAttempt", payload);
    await harness.mutate("claimStripeRefundAttempt", { attemptId });
    vi.setSystemTime(Date.now() + STRIPE_REFUND_LEASE_MS + 1);
    await harness.mutate("claimStripeRefundAttempt", { attemptId });
    await harness.mutate("recordStripeRefundResult", { attemptId, leaseVersion: 2, refunded: true });
    expect(await harness.mutate("deferStripeRefundAttempt", {
      attemptId, leaseVersion: 1, message: "old worker failed",
    })).toBe(false);
    expect(await harness.mutate("completeStripeRefundAttempt", { attemptId, leaseVersion: 1 })).toBe(false);
    expect(harness.orderStatus()).toBe("cancelled");
    expect(await harness.mutate("completeStripeRefundAttempt", { attemptId, leaseVersion: 2 })).toBe(true);
    expect(harness.orderStatus()).toBe("refunded");
  });

  it("claims only one worker for concurrent deliveries of the same refund", async () => {
    const harness = createHarness();
    await Promise.all([harness.run(payload), harness.run(payload)]);
    expect(harness.attempts()).toHaveLength(1);
    expect(harness.attempts()[0]?.status).toBe("succeeded");
    expect(stripeCalls.create).toHaveBeenCalledTimes(1);
  });

  it.each(["reconcile", "completionPatch"] as const)(
    "rolls back local completion on %s failure and retries without another Stripe request",
    async (fault) => {
      const harness = createHarness();
      harness.faults[fault] = 1;
      await harness.run(payload);
      const deferred = harness.attempts()[0]!;
      expect(deferred).toMatchObject({ status: "pending", attempts: 1, stripeRefundId: "re_1" });
      expect(deferred.stripeRefundedAt).toBeDefined();
      expect(harness.orderStatus()).toBe("cancelled");
      vi.setSystemTime(deferred.nextAttemptAt);
      await harness.cron();
      expect(harness.attempts()[0]?.status).toBe("succeeded");
      expect(harness.orderStatus()).toBe("refunded");
      expect(stripeCalls.create).toHaveBeenCalledTimes(1);
    }
  );

  it("recovers an unknown Stripe outcome from metadata after the idempotency cache can expire", async () => {
    const harness = createHarness();
    harness.faults.record = 1;
    await harness.run(payload);
    expect(harness.attempts()[0]?.stripeRefundId).toBeUndefined();
    expect(externalRefunds.size).toBe(1);
    vi.setSystemTime(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await harness.cron();
    expect(stripeCalls.list).toHaveBeenCalledTimes(1);
    expect(stripeCalls.create).toHaveBeenCalledTimes(1);
    expect(harness.attempts()[0]?.status).toBe("succeeded");
  });

  it("polls a pending Stripe refund instead of marking the order refunded or submitting it again", async () => {
    const harness = createHarness();
    stripeCalls.create.mockImplementationOnce(async (params: { metadata: Record<string, string> }) => {
      const refund: ControlledRefund = { id: "re_pending", status: "pending", metadata: params.metadata };
      externalRefunds.set(params.metadata.refundAttemptKey!, refund);
      return refund;
    });
    await harness.run(payload);
    const pending = harness.attempts()[0]!;
    expect(pending).toMatchObject({ status: "pending", stripeRefundId: "re_pending" });
    expect(pending.stripeRefundedAt).toBeUndefined();
    expect(harness.orderStatus()).toBe("cancelled");
    externalRefunds.get(pending.idempotencyKey)!.status = "succeeded";
    vi.setSystemTime(pending.nextAttemptAt);
    await harness.cron();
    expect(stripeCalls.retrieve).toHaveBeenCalledWith("re_pending");
    expect(stripeCalls.create).toHaveBeenCalledTimes(1);
    expect(harness.orderStatus()).toBe("refunded");
  });

  it("keeps zero-amount cancellations retryable when local reconciliation fails", async () => {
    const harness = createHarness();
    harness.faults.reconcile = 1;
    await harness.run({ ...payload, amountCents: 0 });
    const pending = harness.attempts()[0]!;
    expect(pending.status).toBe("pending");
    vi.setSystemTime(pending.nextAttemptAt);
    await harness.cron();
    expect(harness.orderStatus()).toBe("refunded");
    expect(stripeCalls.create).not.toHaveBeenCalled();
  });

  it("honors the retry delay and lets unrelated refunds run after a worker error", async () => {
    const harness = createHarness();
    harness.faults.reconcile = 1;
    await harness.run(payload);
    await harness.run(payload);
    expect(stripeCalls.create).toHaveBeenCalledTimes(1);
    const other = { ...payload, paymentIntentId: "pi_2" };
    await harness.mutate("enqueueStripeRefundAttempt", other);
    vi.setSystemTime(harness.attempts()[0]!.nextAttemptAt);
    harness.faults.workerPayment = "pi_1";
    await harness.cron();
    expect(harness.attempts().find((attempt) => attempt.paymentIntentId === "pi_2")?.status).toBe("succeeded");
    expect(harness.attempts().find((attempt) => attempt.paymentIntentId === "pi_1")?.status).toBe("pending");
  });
});
