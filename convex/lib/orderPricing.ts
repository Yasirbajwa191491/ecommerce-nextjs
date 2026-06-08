import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { isProductActive } from "./productActive";
import {
  allocateProductShipping,
  calculateLineTotals,
  calculateOrderTotals,
  clampDiscountPercent,
} from "./pricing";

export type CartLineInput = {
  productId: Id<"products">;
  color: string;
  quantity: number;
};

export type PricedLineItem = {
  productId: Id<"products">;
  productName: string;
  color: string;
  sku?: string;
  size?: string;
  quantity: number;
  /** Legacy field: final unit price after discount */
  unitPrice: number;
  lineTotal: number;
  imageUrl: string;
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  originalLineSubtotal: number;
  shippingCharge: number;
  lineShippingTotal: number;
};

export type OrderTotals = {
  subtotal: number;
  discountTotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  items: PricedLineItem[];
};

type DbCtx = QueryCtx | MutationCtx;

export async function priceCartLines(
  ctx: DbCtx,
  lines: CartLineInput[]
): Promise<OrderTotals> {
  if (!lines.length) {
    throw new Error("Your cart is empty");
  }

  const pricedLines: PricedLineItem[] = [];
  const shippingAllocatedForProduct = new Set<string>();
  const requestedQtyByProduct = new Map<string, number>();
  let currency: string | null = null;

  for (const line of lines) {
    const product = await ctx.db.get(line.productId);
    if (!product) {
      throw new Error("A product in your cart no longer exists");
    }
    if (!isProductActive(product)) {
      throw new Error(`"${product.name}" is no longer available`);
    }
    if (!product.colors.includes(line.color)) {
      throw new Error(`Invalid color selected for "${product.name}"`);
    }

    const totalRequested =
      (requestedQtyByProduct.get(line.productId) ?? 0) + line.quantity;
    requestedQtyByProduct.set(line.productId, totalRequested);

    if (product.stock < totalRequested) {
      throw new Error(
        `Insufficient stock for "${product.name}". Only ${product.stock} available.`
      );
    }

    const productCurrency = product.currency ?? "USD";
    if (currency === null) {
      currency = productCurrency;
    } else if (currency !== productCurrency) {
      throw new Error("All items must use the same currency");
    }

    const freeShipping = product.shipping === true;
    const discountPercent = clampDiscountPercent(product.discountPercent ?? 0);
    const shippingCharges = freeShipping ? 0 : (product.shippingCharges ?? 0);

    if (!freeShipping && shippingCharges < 0) {
      throw new Error(`Invalid shipping charges for "${product.name}"`);
    }

    const linePricing = calculateLineTotals({
      originalPrice: product.price,
      discountPercent,
      shippingCharges,
      quantity: line.quantity,
      freeShipping: true,
    });

    const lineShippingTotal = allocateProductShipping(
      line.productId,
      shippingCharges,
      freeShipping,
      shippingAllocatedForProduct
    );

    pricedLines.push({
      productId: line.productId,
      productName: product.name,
      color: line.color,
      sku: product.sku,
      quantity: line.quantity,
      unitPrice: linePricing.finalUnitPrice,
      lineTotal: linePricing.lineTotal,
      imageUrl: product.image[0]?.url ?? "",
      originalUnitPrice: linePricing.originalUnitPrice,
      discountPercent: linePricing.discountPercent,
      discountAmount: linePricing.discountAmount,
      lineDiscountTotal: linePricing.lineDiscountTotal,
      finalUnitPrice: linePricing.finalUnitPrice,
      originalLineSubtotal: linePricing.originalLineSubtotal,
      shippingCharge: lineShippingTotal,
      lineShippingTotal,
    });
  }

  const totals = calculateOrderTotals(pricedLines, 0);

  return {
    subtotal: totals.subtotal,
    discountTotal: totals.discountTotal,
    tax: totals.tax,
    shipping: totals.shipping,
    total: totals.total,
    currency: currency ?? "USD",
    items: pricedLines,
  };
}
