import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { OrderStatus, PaymentMethod, PaymentStatus } from "./orderValidators";

export type StockLine = {
  productId: Id<"products">;
  quantity: number;
};

/**
 * Authoritative commit/release flag — never infer this from order.status.
 * `undefined` means inventory is currently deducted.
 * A timestamp means inventory is not deducted (never committed, or returned after a hold).
 */
export function isHeldStockReleased(stockReleasedAt?: number): boolean {
  return stockReleasedAt != null;
}

/** Checkout creates uncommitted orders so unpaid Stripe / pending COD do not reduce stock. */
export function uncommittedStockTimestamp(now = Date.now()): number {
  return now;
}

/**
 * Stripe: commit only after the card payment is collected (order is confirmed in the same step).
 * COD: commit when admin confirms, ships, or delivers — not while pending or processing.
 */
export function shouldCommitInventory(order: {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}): boolean {
  if (order.paymentMethod === "stripe") {
    return order.paymentStatus === "paid";
  }
  return (
    order.status === "confirmed" ||
    order.status === "shipped" ||
    order.status === "delivered"
  );
}

export function shouldReleaseHeldStock(stockReleasedAt?: number): boolean {
  return !isHeldStockReleased(stockReleasedAt);
}

export function shouldHoldStockAgain(stockReleasedAt?: number): boolean {
  return isHeldStockReleased(stockReleasedAt);
}

function toReplaceableOrderFields(order: Doc<"orders">) {
  const { _id: _orderId, _creationTime: _created, ...fields } = order;
  void _orderId;
  void _created;
  return fields;
}

/** Sum quantities for the same product (e.g. multiple color lines in one cart). */
export function aggregateStockLines(lines: StockLine[]): StockLine[] {
  const byProduct = new Map<Id<"products">, number>();
  for (const line of lines) {
    byProduct.set(
      line.productId,
      (byProduct.get(line.productId) ?? 0) + line.quantity
    );
  }
  return Array.from(byProduct.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function assertStockAvailable(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of aggregateStockLines(lines)) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    if (product.stock < line.quantity) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }
  }
}

export async function decrementStock(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of aggregateStockLines(lines)) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    const nextStock = product.stock - line.quantity;
    if (nextStock < 0) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }
    await ctx.db.patch(line.productId, { stock: nextStock });
  }
}

export async function restoreStock(
  ctx: MutationCtx,
  lines: StockLine[]
): Promise<void> {
  for (const line of aggregateStockLines(lines)) {
    const product = await ctx.db.get(line.productId);
    if (!product) continue;
    await ctx.db.patch(line.productId, {
      stock: product.stock + line.quantity,
    });
  }
}

export async function getOrderStockLines(
  ctx: MutationCtx,
  orderId: Id<"orders">
): Promise<StockLine[]> {
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order_id", (q) => q.eq("orderId", orderId))
    .collect();
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
  }));
}

/**
 * Restore this order's deducted quantities exactly once.
 * No-op when `stockReleasedAt` is set (never committed, or already returned).
 */
export async function releaseHeldStockIfNeeded(
  ctx: MutationCtx,
  order: Doc<"orders">
): Promise<{ released: boolean; alreadyReleased: boolean }> {
  if (isHeldStockReleased(order.stockReleasedAt)) {
    return { released: false, alreadyReleased: true };
  }

  const stockLines = await getOrderStockLines(ctx, order._id);
  await restoreStock(ctx, stockLines);
  await ctx.db.patch(order._id, {
    stockReleasedAt: Date.now(),
    updatedAt: Date.now(),
  });
  return { released: true, alreadyReleased: false };
}

/**
 * Deduct inventory only if this order is currently uncommitted (`stockReleasedAt` set).
 * Clears `stockReleasedAt` so a later cancel/refund can restore stock once.
 */
export async function holdStockIfNeeded(
  ctx: MutationCtx,
  order: Doc<"orders">
): Promise<{ held: boolean; alreadyHeld: boolean }> {
  if (!shouldHoldStockAgain(order.stockReleasedAt)) {
    return { held: false, alreadyHeld: true };
  }

  const stockLines = await getOrderStockLines(ctx, order._id);
  await decrementStock(ctx, stockLines);

  const fields = toReplaceableOrderFields(order);
  delete fields.stockReleasedAt;
  await ctx.db.replace(order._id, {
    ...fields,
    updatedAt: Date.now(),
  });
  return { held: true, alreadyHeld: false };
}

/** Deduct stock when the projected payment/status means the order is actually accepted. */
export async function commitStockIfRequired(
  ctx: MutationCtx,
  order: Doc<"orders">,
  nextState?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
  }
): Promise<{ committed: boolean; alreadyCommitted: boolean; skipped: boolean }> {
  const projected = {
    paymentMethod: order.paymentMethod,
    paymentStatus: nextState?.paymentStatus ?? order.paymentStatus,
    status: nextState?.status ?? order.status,
  };
  if (!shouldCommitInventory(projected)) {
    return { committed: false, alreadyCommitted: false, skipped: true };
  }
  const result = await holdStockIfNeeded(ctx, order);
  return {
    committed: result.held,
    alreadyCommitted: result.alreadyHeld,
    skipped: false,
  };
}
