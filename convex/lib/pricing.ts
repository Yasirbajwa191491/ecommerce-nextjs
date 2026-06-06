export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function clampDiscountPercent(discountPercent: number): number {
  if (!Number.isFinite(discountPercent)) return 0;
  return Math.min(100, Math.max(0, discountPercent));
}

export function calculateDiscountAmount(
  originalPrice: number,
  discountPercent: number
): number {
  const percent = clampDiscountPercent(discountPercent);
  return roundMoney((originalPrice * percent) / 100);
}

export function calculateFinalPrice(
  originalPrice: number,
  discountPercent: number
): number {
  return roundMoney(
    originalPrice - calculateDiscountAmount(originalPrice, discountPercent)
  );
}

export function calculateLineDiscountTotal(
  originalPrice: number,
  discountPercent: number,
  quantity: number
): number {
  return roundMoney(
    calculateDiscountAmount(originalPrice, discountPercent) * quantity
  );
}

/** Flat shipping charge per cart line (not multiplied by quantity). */
export function calculateLineShipping(
  shippingCharges: number,
  freeShipping: boolean
): number {
  if (freeShipping) return 0;
  if (!Number.isFinite(shippingCharges) || shippingCharges < 0) return 0;
  return roundMoney(shippingCharges);
}

export type LinePricingInput = {
  originalPrice: number;
  discountPercent: number;
  shippingCharges: number;
  quantity: number;
  freeShipping: boolean;
};

export type LinePricingResult = {
  originalUnitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineDiscountTotal: number;
  finalUnitPrice: number;
  originalLineSubtotal: number;
  lineTotal: number;
  shippingCharge: number;
  lineShippingTotal: number;
};

export function calculateLineTotals(input: LinePricingInput): LinePricingResult {
  const originalUnitPrice = roundMoney(input.originalPrice);
  const discountPercent = clampDiscountPercent(input.discountPercent);
  const discountAmount = calculateDiscountAmount(originalUnitPrice, discountPercent);
  const finalUnitPrice = calculateFinalPrice(originalUnitPrice, discountPercent);
  const quantity = Math.max(0, input.quantity);
  const originalLineSubtotal = roundMoney(originalUnitPrice * quantity);
  const lineDiscountTotal = calculateLineDiscountTotal(
    originalUnitPrice,
    discountPercent,
    quantity
  );
  const lineTotal = roundMoney(finalUnitPrice * quantity);
  const shippingCharge = calculateLineShipping(
    input.shippingCharges,
    input.freeShipping
  );
  const lineShippingTotal = shippingCharge;

  return {
    originalUnitPrice,
    discountPercent,
    discountAmount,
    lineDiscountTotal,
    finalUnitPrice,
    originalLineSubtotal,
    lineTotal,
    shippingCharge,
    lineShippingTotal,
  };
}

export type OrderPricingLine = {
  originalLineSubtotal: number;
  lineDiscountTotal: number;
  lineShippingTotal: number;
};

export type OrderPricingTotals = {
  subtotal: number;
  discountTotal: number;
  shipping: number;
  tax: number;
  total: number;
};

export function calculateOrderTotals(
  lines: OrderPricingLine[],
  tax = 0
): OrderPricingTotals {
  const subtotal = roundMoney(
    lines.reduce((sum, line) => sum + line.originalLineSubtotal, 0)
  );
  const discountTotal = roundMoney(
    lines.reduce((sum, line) => sum + line.lineDiscountTotal, 0)
  );
  const shipping = roundMoney(
    lines.reduce((sum, line) => sum + line.lineShippingTotal, 0)
  );
  const roundedTax = roundMoney(tax);
  const total = roundMoney(subtotal - discountTotal + shipping + roundedTax);

  return {
    subtotal,
    discountTotal,
    shipping,
    tax: roundedTax,
    total,
  };
}

export function validateProductDiscountPercent(discountPercent?: number): number {
  const value = discountPercent ?? 0;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Discount percentage must be between 0 and 100");
  }
  return value;
}

export function normalizeProductShippingCharges(
  freeShipping: boolean,
  shippingCharges?: number
): number {
  if (freeShipping) return 0;
  const value = shippingCharges ?? 0;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Shipping charges must be zero or greater");
  }
  return roundMoney(value);
}
