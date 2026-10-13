import { describe, expect, it } from "vitest";

import type { Id } from "../_generated/dataModel";
import {
  decrementStock,
  isHeldStockReleased,
  shouldCommitInventory,
  shouldHoldStockAgain,
  shouldReleaseHeldStock,
} from "./inventory";

describe("inventory hold/release gate", () => {
  it("treats missing stockReleasedAt as currently deducted", () => {
    expect(isHeldStockReleased(undefined)).toBe(false);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
    expect(shouldHoldStockAgain(undefined)).toBe(false);
  });

  it("does not infer release from cancelled/refunded/failed/expired status", () => {
    expect(isHeldStockReleased(undefined)).toBe(false);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
  });

  it("releases only when the flag is unset and re-holds only when it is set", () => {
    expect(shouldReleaseHeldStock(1_710_000_000_000)).toBe(false);
    expect(shouldHoldStockAgain(1_710_000_000_000)).toBe(true);
    expect(shouldReleaseHeldStock(undefined)).toBe(true);
    expect(shouldHoldStockAgain(undefined)).toBe(false);
  });
});

describe("when inventory is committed", () => {
  it("does not deduct Stripe stock until the payment is paid", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "stripe",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldCommitInventory({
        paymentMethod: "stripe",
        paymentStatus: "paid",
        status: "confirmed",
      })
    ).toBe(true);
  });

  it("does not deduct COD stock while pending or processing", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "pending",
      })
    ).toBe(false);
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "processing",
      })
    ).toBe(false);
  });

  it("deducts COD stock after admin confirms, ships, or delivers", () => {
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "confirmed",
      })
    ).toBe(true);
    expect(
      shouldCommitInventory({
        paymentMethod: "cod",
        paymentStatus: "paid",
        status: "shipped",
      })
    ).toBe(true);
  });
});

describe("multi-product stock commits", () => {
  function memoryStock() {
    const rows = new Map<string, { name: string; stock: number }>();
    return {
      add(name: string, stock: number) {
        const id = `products:${name}` as Id<"products">;
        rows.set(id, { name, stock });
        return id;
      },
      stock(id: Id<"products">) {
        return rows.get(id)?.stock;
      },
      ctx: {
        db: {
          get: async (id: Id<"products">) => {
            const row = rows.get(id);
            return row ? { name: row.name, stock: row.stock } : null;
          },
          patch: async (id: Id<"products">, fields: { stock: number }) => {
            const row = rows.get(id);
            if (!row) throw new Error("missing product");
            rows.set(id, { ...row, stock: fields.stock });
          },
        },
      },
    };
  }

  it("does not deduct an earlier line when a later line is out of stock", async () => {
    const db = memoryStock();
    const productA = db.add("A", 5);
    const productB = db.add("B", 0);

    await expect(
      decrementStock(db.ctx, [
        { productId: productA, quantity: 1 },
        { productId: productB, quantity: 1 },
      ])
    ).rejects.toThrow(/Insufficient stock/);

    expect(db.stock(productA)).toBe(5);
    expect(db.stock(productB)).toBe(0);
  });

  it("restores lines already written when a later patch fails", async () => {
    const db = memoryStock();
    const productA = db.add("A", 5);
    const productB = db.add("B", 4);
    const originalPatch = db.ctx.db.patch.bind(db.ctx.db);
    db.ctx.db.patch = async (id, fields) => {
      if (id === productB) throw new Error("write failed");
      await originalPatch(id, fields);
    };

    await expect(
      decrementStock(db.ctx, [
        { productId: productA, quantity: 1 },
        { productId: productB, quantity: 1 },
      ])
    ).rejects.toThrow(/write failed/);

    expect(db.stock(productA)).toBe(5);
    expect(db.stock(productB)).toBe(4);
  });
});
