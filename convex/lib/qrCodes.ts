import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { buildQrUrl, generateQrToken, hashQrToken } from "./qrTokens";
import {
  QR_PAYMENT_TTL_MS,
  QR_RESOLVE_MESSAGES,
  type QrResolveCode,
  type QrScanEvent,
  type QrScanSource,
  type QrType,
} from "./qrValidators";
import {
  canRetryStripePayment,
  isPendingStripeOrder,
} from "./orderNotificationLogic";
import { canTransitionFulfillmentStatus } from "./adminOrderTransitions";
import type { OrderStatus } from "./orderValidators";

type DbCtx = QueryCtx | MutationCtx;

export type EnsuredQr = {
  qr: Doc<"qrCodes">;
  token: string;
  url: string;
  created: boolean;
};

export function isQrExpired(qr: Doc<"qrCodes">, now = Date.now()): boolean {
  if (qr.status === "expired") return true;
  if (qr.expiresAt !== undefined && qr.expiresAt <= now) return true;
  return false;
}

export async function findQrByToken(
  ctx: DbCtx,
  token: string
): Promise<Doc<"qrCodes"> | null> {
  const tokenHash = await hashQrToken(token);
  return await ctx.db
    .query("qrCodes")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
}

export async function findActiveQrForTarget(
  ctx: DbCtx,
  args: { type: QrType; targetId: string }
): Promise<Doc<"qrCodes"> | null> {
  const rows = await ctx.db
    .query("qrCodes")
    .withIndex("by_type_target_status", (q) =>
      q.eq("type", args.type).eq("targetId", args.targetId).eq("status", "active")
    )
    .take(8);

  const now = Date.now();
  for (const row of rows) {
    if (!isQrExpired(row, now)) return row;
  }
  return null;
}

export async function ensureQr(
  ctx: MutationCtx,
  args: {
    type: QrType;
    targetId: string;
    orderId?: Id<"orders">;
    productId?: Id<"products">;
    expiresAt?: number;
    createdBy?: string;
    metadata?: {
      amount?: number;
      currency?: string;
    };
  }
): Promise<EnsuredQr> {
  const existing = await findActiveQrForTarget(ctx, {
    type: args.type,
    targetId: args.targetId,
  });
  if (existing) {
    return {
      qr: existing,
      token: existing.token,
      url: buildQrUrl(args.type, existing.token),
      created: false,
    };
  }

  const now = Date.now();
  const token = generateQrToken();
  const tokenHash = await hashQrToken(token);
  const qrId = await ctx.db.insert("qrCodes", {
    token,
    tokenHash,
    type: args.type,
    targetId: args.targetId,
    orderId: args.orderId,
    productId: args.productId,
    status: "active",
    expiresAt: args.expiresAt,
    createdAt: now,
    updatedAt: now,
    createdBy: args.createdBy,
    metadata: args.metadata,
  });
  const qr = await ctx.db.get(qrId);
  if (!qr) {
    throw new Error("Failed to create QR code");
  }
  return {
    qr,
    token,
    url: buildQrUrl(args.type, token),
    created: true,
  };
}

export async function ensureOrderQr(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  createdBy = "system"
): Promise<EnsuredQr> {
  return await ensureQr(ctx, {
    type: "order",
    targetId: orderId,
    orderId,
    createdBy,
  });
}

export async function revokeQrsForOrderType(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  type: QrType
): Promise<number> {
  const rows = await ctx.db
    .query("qrCodes")
    .withIndex("by_order_type", (q) => q.eq("orderId", orderId).eq("type", type))
    .take(40);
  const now = Date.now();
  let count = 0;
  for (const row of rows) {
    if (row.status === "active") {
      await ctx.db.patch(row._id, { status: "revoked", updatedAt: now });
      count += 1;
    }
  }
  return count;
}

export async function revokeQr(
  ctx: MutationCtx,
  qrId: Id<"qrCodes">
): Promise<boolean> {
  const qr = await ctx.db.get(qrId);
  if (!qr) return false;
  if (qr.status !== "active") return true;
  await ctx.db.patch(qrId, { status: "revoked", updatedAt: Date.now() });
  return true;
}

export async function regenerateQr(
  ctx: MutationCtx,
  args: {
    type: QrType;
    targetId: string;
    orderId?: Id<"orders">;
    productId?: Id<"products">;
    expiresAt?: number;
    createdBy?: string;
    metadata?: { amount?: number; currency?: string };
  }
): Promise<EnsuredQr> {
  const active = await findActiveQrForTarget(ctx, {
    type: args.type,
    targetId: args.targetId,
  });
  if (active) {
    await revokeQr(ctx, active._id);
  }
  return await ensureQr(ctx, args);
}

export async function recordQrScan(
  ctx: MutationCtx,
  args: {
    qr?: Doc<"qrCodes"> | null;
    type?: QrType;
    targetId?: string;
    source: QrScanSource;
    platform?: string;
    authenticatedUserId?: string;
    success: boolean;
    event?: QrScanEvent;
    failureReason?: QrResolveCode;
    /** When false, do not bump lastScannedAt (e.g. webhook payment_succeeded). */
    touchLastScanned?: boolean;
  }
): Promise<void> {
  const now = Date.now();
  const touchLastScanned = args.touchLastScanned !== false;
  if (args.qr && touchLastScanned) {
    await ctx.db.patch(args.qr._id, {
      lastScannedAt: now,
      lastScanSource: args.source,
      updatedAt: now,
    });
  }
  await ctx.db.insert("qrScans", {
    qrCodeId: args.qr?._id,
    type: args.type ?? args.qr?.type,
    targetId: args.targetId ?? args.qr?.targetId,
    scannedAt: now,
    source: args.source,
    platform: args.platform,
    authenticatedUserId: args.authenticatedUserId,
    success: args.success,
    event: args.event,
    failureReason: args.failureReason,
  });
}

/** After Stripe confirms payment, log payment_succeeded for active payment QRs then revoke them. */
export async function revokePaymentQrsAfterPaid(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<number> {
  const rows = await ctx.db
    .query("qrCodes")
    .withIndex("by_order_type", (q) => q.eq("orderId", orderId).eq("type", "payment"))
    .take(40);
  const active = rows.filter((row) => row.status === "active");
  for (const qr of active) {
    await recordQrScan(ctx, {
      qr,
      type: "payment",
      targetId: qr.targetId,
      source: "webhook",
      success: true,
      event: "payment_succeeded",
      touchLastScanned: false,
    });
  }
  return await revokeQrsForOrderType(ctx, orderId, "payment");
}

export function resolveQrStatusCode(
  qr: Doc<"qrCodes"> | null,
  now = Date.now()
): QrResolveCode {
  if (!qr) return "invalid";
  if (qr.status === "revoked") return "revoked";
  if (isQrExpired(qr, now)) return "expired";
  if (qr.status !== "active") return "invalid";
  return "ok";
}

export function paymentQrEligibility(order: Doc<"orders">): QrResolveCode {
  if (order.paymentStatus === "paid") return "already_paid";
  if (order.status === "cancelled" || order.status === "refunded") {
    return "cancelled";
  }
  if (
    isPendingStripeOrder({
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
    }) ||
    canRetryStripePayment({
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
    })
  ) {
    return "ok";
  }
  return "payment_unavailable";
}

export function staffFulfillmentActions(status: OrderStatus): Array<{
  id: "processing" | "shipped" | "delivered";
  label: string;
  nextStatus: OrderStatus;
}> {
  const options: Array<{
    id: "processing" | "shipped" | "delivered";
    label: string;
    nextStatus: OrderStatus;
  }> = [
    { id: "processing", label: "Mark packed", nextStatus: "processing" },
    { id: "shipped", label: "Mark shipped", nextStatus: "shipped" },
    { id: "delivered", label: "Confirm delivered", nextStatus: "delivered" },
  ];
  return options.filter((option) =>
    canTransitionFulfillmentStatus(status, option.nextStatus)
  );
}

export function publicResolveMessage(code: QrResolveCode): string {
  return QR_RESOLVE_MESSAGES[code];
}

export function paymentQrExpiresAt(now = Date.now()): number {
  return now + QR_PAYMENT_TTL_MS;
}

export async function listQrForTarget(
  ctx: QueryCtx,
  args: { type: QrType; targetId: string }
): Promise<Doc<"qrCodes">[]> {
  const rows = await ctx.db
    .query("qrCodes")
    .withIndex("by_type_target_status", (q) =>
      q.eq("type", args.type).eq("targetId", args.targetId)
    )
    .take(20);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listRecentScans(
  ctx: QueryCtx,
  qrCodeId: Id<"qrCodes">,
  limit = 20
): Promise<Doc<"qrScans">[]> {
  const rows = await ctx.db
    .query("qrScans")
    .withIndex("by_qr_code", (q) => q.eq("qrCodeId", qrCodeId))
    .order("desc")
    .take(Math.min(limit, 50));
  return rows;
}
