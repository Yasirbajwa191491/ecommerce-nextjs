import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/requireAdmin";
import { getAuthUserOrNull } from "./lib/requireAdmin";
import { isAdminRole } from "./lib/authRoles";
import { buildTrackingBucketKey } from "./lib/rateLimit";
import { isProductActive } from "./lib/productActive";
import {
  toPublicOrderDetail,
  type PublicOrderDetail,
} from "./lib/publicOrderDto";
import { buildQrUrl, hashQrToken, isQrTokenShape, parseQrPayload } from "./lib/qrTokens";
import {
  ensureOrderQr,
  ensureQr,
  findActiveQrForTarget,
  findQrByToken,
  isQrExpired,
  listQrForTarget,
  listRecentScans,
  paymentQrEligibility,
  paymentQrExpiresAt,
  publicResolveMessage,
  recordQrScan,
  regenerateQr,
  resolveQrStatusCode,
  revokeQr,
  revokeQrsForOrderType,
  staffFulfillmentActions,
} from "./lib/qrCodes";
import {
  qrResolveCodeValidator,
  qrScanEventValidator,
  qrScanSourceValidator,
  qrTypeValidator,
  type QrResolveCode,
  type QrScanEvent,
  type QrScanSource,
  type QrType,
} from "./lib/qrValidators";
import { canTransitionFulfillmentStatus } from "./lib/adminOrderTransitions";
import { getOrderStatusLogsForPublic } from "./lib/orderLogs";

const INVALID: QrResolveCode = "invalid";

type AdminQrCard = {
  qrId: Id<"qrCodes">;
  type: QrType;
  url: string;
  status: Doc<"qrCodes">["status"];
  expiresAt?: number;
  lastScannedAt?: number;
  createdAt: number;
  amount?: number;
  currency?: string;
};

function toAdminCard(qr: Doc<"qrCodes">): AdminQrCard {
  return {
    qrId: qr._id,
    type: qr.type,
    url: buildQrUrl(qr.type, qr.token),
    status: qr.status,
    expiresAt: qr.expiresAt,
    lastScannedAt: qr.lastScannedAt,
    createdAt: qr.createdAt,
    amount: qr.metadata?.amount,
    currency: qr.metadata?.currency,
  };
}

async function isCallerAdmin(ctx: Parameters<typeof getAuthUserOrNull>[0]) {
  const user = await getAuthUserOrNull(ctx);
  if (!user || user.banned) return { admin: false as const, user: null };
  if (!isAdminRole(user.role)) return { admin: false as const, user };
  return { admin: true as const, user };
}

export const ensureOrderQrInternal = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ensureOrderQr(ctx, args.orderId);
  },
});

export const revokePaymentQrsForOrder = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await revokeQrsForOrderType(ctx, args.orderId, "payment");
  },
});

export const getReceiptOrderQrUrl = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const ensured = await ensureOrderQr(ctx, args.orderId, "receipt");
    return { url: ensured.url };
  },
});

export const lookupPaymentOrderFromQr = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!isQrTokenShape(args.token)) return { code: "invalid" as const };
    const qr = await findQrByToken(ctx, args.token);
    const statusCode = resolveQrStatusCode(qr);
    if (statusCode !== "ok" || !qr || qr.type !== "payment" || !qr.orderId) {
      return { code: (statusCode === "ok" ? "invalid" : statusCode) as QrResolveCode };
    }
    const order = await ctx.db.get(qr.orderId);
    if (!order) return { code: "not_found" as const };
    const eligibility = paymentQrEligibility(order);
    if (eligibility !== "ok") return { code: eligibility, order };
    return { code: "ok" as const, qr, order };
  },
});

export const recordScanInternal = internalMutation({
  args: {
    token: v.string(),
    source: qrScanSourceValidator,
    platform: v.optional(v.string()),
    authenticatedUserId: v.optional(v.string()),
    success: v.boolean(),
    event: v.optional(qrScanEventValidator),
    failureReason: v.optional(qrResolveCodeValidator),
    markExpired: v.optional(v.boolean()),
    touchLastScanned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const qr = isQrTokenShape(args.token) ? await findQrByToken(ctx, args.token) : null;
    if (qr && args.markExpired && isQrExpired(qr) && qr.status === "active") {
      await ctx.db.patch(qr._id, { status: "expired", updatedAt: Date.now() });
    }
    const event: QrScanEvent | undefined =
      args.event ?? (args.success ? "resolved" : undefined);
    await recordQrScan(ctx, {
      qr,
      type: qr?.type,
      targetId: qr?.targetId,
      source: args.source,
      platform: args.platform,
      authenticatedUserId: args.authenticatedUserId,
      success: args.success,
      event,
      failureReason: args.failureReason,
      touchLastScanned: args.touchLastScanned,
    });
  },
});

function failedResult(code: QrResolveCode) {
  return {
    ok: false as const,
    code,
    message: publicResolveMessage(code),
  };
}

export const resolve = action({
  args: {
    tokenOrUrl: v.string(),
    source: v.optional(qrScanSourceValidator),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    const source: QrScanSource = args.source ?? "unknown";
    const parsed = parseQrPayload(args.tokenOrUrl);

    const token = parsed?.token ?? "";
    const expectedType = parsed?.type;

    const rateKey = token
      ? (await hashQrToken(token)).slice(0, 24)
      : "invalid";
    const rateLimit = await ctx.runMutation(internal.orders.applyTrackingRateLimit, {
      bucketKey: buildTrackingBucketKey("qr", rateKey),
    });
    if (!rateLimit.allowed) {
      return {
        ok: false,
        code: "invalid",
        message: "Too many lookup attempts. Please try again later.",
      };
    }

    if (!token || !isQrTokenShape(token)) {
      await ctx.runMutation(internal.qr.recordScanInternal, {
        token: token || "invalid",
        source,
        platform: args.platform,
        success: false,
        failureReason: "invalid",
      });
      return failedResult("invalid");
    }

    const { admin, user } = await isCallerAdmin(ctx);
    const payload = (await ctx.runQuery(internal.qr.loadResolvePayload, {
      token,
      expectedType,
      isAdmin: admin,
    })) as {
      ok: boolean;
      code: QrResolveCode;
      message: string;
    };

    await ctx.runMutation(internal.qr.recordScanInternal, {
      token,
      source,
      platform: args.platform,
      authenticatedUserId: user?._id,
      success: payload.ok,
      event: "resolved",
      failureReason: payload.ok ? undefined : payload.code,
      markExpired: payload.code === "expired",
    });

    return payload;
  },
});

export const loadResolvePayload = internalQuery({
  args: {
    token: v.string(),
    expectedType: v.optional(qrTypeValidator),
    isAdmin: v.boolean(),
  },
  handler: async (ctx, args) => {
    const qr = await findQrByToken(ctx, args.token);
    const statusCode = resolveQrStatusCode(qr);
    if (statusCode !== "ok" || !qr) {
      return failedResult(statusCode);
    }
    if (args.expectedType && qr.type !== args.expectedType) {
      return failedResult(INVALID);
    }

    if (qr.type === "order") {
      return await resolveOrderPayload(ctx, qr);
    }
    if (qr.type === "product") {
      return await resolveProductPayload(ctx, qr);
    }
    if (qr.type === "payment") {
      return await resolvePaymentPayload(ctx, qr);
    }
    if (qr.type === "package" || qr.type === "delivery") {
      if (!args.isAdmin) {
        return failedResult("unauthorized");
      }
      return await resolveStaffOrderPayload(ctx, qr);
    }
    return failedResult(INVALID);
  },
});

type QueryCtxLike = Parameters<typeof findQrByToken>[0];

async function loadOrderBundle(
  ctx: QueryCtxLike,
  orderId: Id<"orders">
) {
  const order = await ctx.db.get(orderId);
  if (!order) return null;
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
  const statusHistory = await getOrderStatusLogsForPublic(ctx, orderId);
  const promotions = await ctx.db
    .query("orderPromotions")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
  return { order, items, statusHistory, promotions };
}

async function resolveOrderPayload(ctx: QueryCtxLike, qr: Doc<"qrCodes">) {
  if (!qr.orderId) return failedResult("not_found");
  const bundle = await loadOrderBundle(ctx, qr.orderId);
  if (!bundle) return failedResult("not_found");
  const order: PublicOrderDetail = toPublicOrderDetail(
    bundle.order,
    bundle.items,
    bundle.statusHistory,
    bundle.promotions,
    { verified: false }
  );
  return {
    ok: true as const,
    code: "ok" as const,
    message: publicResolveMessage("ok"),
    type: "order" as const,
    orderNumber: bundle.order.orderNumber,
    order,
  };
}

async function resolveProductPayload(ctx: QueryCtxLike, qr: Doc<"qrCodes">) {
  if (!qr.productId) return failedResult("not_found");
  const product = await ctx.db.get(qr.productId);
  if (!product || !isProductActive(product)) return failedResult("not_found");
  return {
    ok: true as const,
    code: "ok" as const,
    message: publicResolveMessage("ok"),
    type: "product" as const,
    productId: product._id,
    productName: product.name,
  };
}

async function resolvePaymentPayload(ctx: QueryCtxLike, qr: Doc<"qrCodes">) {
  if (!qr.orderId) return failedResult("not_found");
  const order = await ctx.db.get(qr.orderId);
  if (!order) return failedResult("not_found");
  const eligibility = paymentQrEligibility(order);
  if (eligibility !== "ok") {
    return {
      ok: false as const,
      code: eligibility,
      message: publicResolveMessage(eligibility),
      type: "payment" as const,
      orderNumber: order.orderNumber,
      amount: order.total,
      currency: order.currency,
    };
  }
  return {
    ok: true as const,
    code: "ok" as const,
    message: publicResolveMessage("ok"),
    type: "payment" as const,
    orderNumber: order.orderNumber,
    amount: order.total,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    expiresAt: qr.expiresAt,
  };
}

async function resolveStaffOrderPayload(ctx: QueryCtxLike, qr: Doc<"qrCodes">) {
  if (!qr.orderId) return failedResult("not_found");
  const bundle = await loadOrderBundle(ctx, qr.orderId);
  if (!bundle) return failedResult("not_found");
  const { order, items } = bundle;
  const actions = staffFulfillmentActions(order.status).filter((action) =>
    canTransitionFulfillmentStatus(order.status, action.nextStatus)
  );
  return {
    ok: true as const,
    code: "ok" as const,
    message: publicResolveMessage("ok"),
    type: qr.type,
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    customerName: order.customerName,
    customerAddress: order.customerAddress,
    customerPhone: order.customerPhone,
    total: order.total,
    currency: order.currency,
    items: items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      color: item.color,
    })),
    actions,
  };
}

export const createOrderQr = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const ensured = await ensureQr(ctx, {
      type: "order",
      targetId: args.orderId,
      orderId: args.orderId,
      createdBy: admin._id,
    });
    return toAdminCard(ensured.qr);
  },
});

export const createPackageQr = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const ensured = await ensureQr(ctx, {
      type: "package",
      targetId: args.orderId,
      orderId: args.orderId,
      createdBy: admin._id,
    });
    return toAdminCard(ensured.qr);
  },
});

export const createDeliveryQr = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const ensured = await ensureQr(ctx, {
      type: "delivery",
      targetId: args.orderId,
      orderId: args.orderId,
      createdBy: admin._id,
    });
    return toAdminCard(ensured.qr);
  },
});

export const createPaymentQr = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    const eligibility = paymentQrEligibility(order);
    if (eligibility !== "ok") {
      throw new Error(publicResolveMessage(eligibility));
    }
    const existing = await findActiveQrForTarget(ctx, {
      type: "payment",
      targetId: args.orderId,
    });
    if (existing) {
      return toAdminCard(existing);
    }
    const ensured = await ensureQr(ctx, {
      type: "payment",
      targetId: args.orderId,
      orderId: args.orderId,
      createdBy: admin._id,
      expiresAt: paymentQrExpiresAt(),
      metadata: { amount: order.total, currency: order.currency },
    });
    return toAdminCard(ensured.qr);
  },
});

export const createProductQr = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");
    const ensured = await ensureQr(ctx, {
      type: "product",
      targetId: args.productId,
      productId: args.productId,
      createdBy: admin._id,
    });
    return toAdminCard(ensured.qr);
  },
});

export const revoke = mutation({
  args: { qrId: v.id("qrCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const ok = await revokeQr(ctx, args.qrId);
    if (!ok) throw new Error("QR code not found");
    return { success: true as const };
  },
});

export const regenerate = mutation({
  args: {
    qrId: v.id("qrCodes"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.qrId);
    if (!existing) throw new Error("QR code not found");
    const expiresAt =
      existing.type === "payment" ? paymentQrExpiresAt() : existing.expiresAt;
    const ensured = await regenerateQr(ctx, {
      type: existing.type,
      targetId: existing.targetId,
      orderId: existing.orderId,
      productId: existing.productId,
      expiresAt,
      createdBy: admin._id,
      metadata: existing.metadata,
    });
    return toAdminCard(ensured.qr);
  },
});

export const listForOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const types: QrType[] = ["order", "package", "payment", "delivery"];
    const cards: AdminQrCard[] = [];
    for (const type of types) {
      const rows = await listQrForTarget(ctx, { type, targetId: args.orderId });
      for (const row of rows) {
        cards.push(toAdminCard(row));
      }
    }
    return cards.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listForProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const rows = await listQrForTarget(ctx, {
      type: "product",
      targetId: args.productId,
    });
    return rows.map(toAdminCard);
  },
});

export const listScans = query({
  args: { qrId: v.id("qrCodes") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const scans = await listRecentScans(ctx, args.qrId, 20);
    return scans.map((scan) => ({
      scannedAt: scan.scannedAt,
      source: scan.source,
      platform: scan.platform,
      success: scan.success,
      event: scan.event,
      failureReason: scan.failureReason,
    }));
  },
});
