import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import type { OrderStatus, PaymentStatus } from "./orderValidators";

type DbCtx = QueryCtx | MutationCtx;

export type OrderStatusLogInput = {
  orderId: Id<"orders">;
  event: string;
  description: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  actorType: "system" | "admin" | "customer";
  actorUserId?: string;
  actorName?: string;
  createdAt: number;
};

export type PaymentLogInput = {
  orderId: Id<"orders">;
  event: string;
  description: string;
  previousPaymentStatus?: PaymentStatus;
  newPaymentStatus?: PaymentStatus;
  actorType: "system" | "admin" | "webhook";
  actorUserId?: string;
  actorName?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeTransactionId?: string;
  amount?: number;
  currency?: string;
  createdAt: number;
};

export async function insertOrderStatusLog(
  ctx: MutationCtx,
  input: OrderStatusLogInput
): Promise<Id<"orderStatusLogs">> {
  return await ctx.db.insert("orderStatusLogs", input);
}

export async function insertPaymentLog(
  ctx: MutationCtx,
  input: PaymentLogInput
): Promise<Id<"paymentLogs">> {
  return await ctx.db.insert("paymentLogs", input);
}

export type MergedTransactionLog = {
  id: string;
  logType: "order_status" | "payment";
  event: string;
  description: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  previousPaymentStatus?: PaymentStatus;
  newPaymentStatus?: PaymentStatus;
  actorType: string;
  actorName?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  stripeTransactionId?: string;
  amount?: number;
  currency?: string;
  createdAt: number;
};

export async function getMergedTransactionLogs(
  ctx: DbCtx,
  orderId: Id<"orders">
): Promise<MergedTransactionLog[]> {
  const statusLogs = await ctx.db
    .query("orderStatusLogs")
    .withIndex("by_order_id_created", (q) => q.eq("orderId", orderId))
    .collect();

  const paymentLogs = await ctx.db
    .query("paymentLogs")
    .withIndex("by_order_id_created", (q) => q.eq("orderId", orderId))
    .collect();

  const merged: MergedTransactionLog[] = [
    ...statusLogs.map((log) => ({
      id: log._id,
      logType: "order_status" as const,
      event: log.event,
      description: log.description,
      previousStatus: log.previousStatus,
      newStatus: log.newStatus,
      actorType: log.actorType,
      actorName: log.actorName,
      createdAt: log.createdAt,
    })),
    ...paymentLogs.map((log) => ({
      id: log._id,
      logType: "payment" as const,
      event: log.event,
      description: log.description,
      previousPaymentStatus: log.previousPaymentStatus,
      newPaymentStatus: log.newPaymentStatus,
      actorType: log.actorType,
      actorName: log.actorName,
      stripeSessionId: log.stripeSessionId,
      stripePaymentIntentId: log.stripePaymentIntentId,
      stripeTransactionId: log.stripeTransactionId,
      amount: log.amount,
      currency: log.currency,
      createdAt: log.createdAt,
    })),
  ];

  merged.sort((a, b) => a.createdAt - b.createdAt);
  return merged;
}

export async function getOrderStatusLogsForPublic(
  ctx: DbCtx,
  orderId: Id<"orders">
) {
  const logs = await ctx.db
    .query("orderStatusLogs")
    .withIndex("by_order_id_created", (q) => q.eq("orderId", orderId))
    .collect();

  return logs.map((log) => ({
    event: log.event,
    description: log.description,
    previousStatus: log.previousStatus,
    newStatus: log.newStatus,
    createdAt: log.createdAt,
  }));
}
