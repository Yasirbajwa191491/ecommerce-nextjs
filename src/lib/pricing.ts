/** Display-only pricing helpers — mirror convex/lib/pricing.ts formulas. */

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

export function calculateLineShipping(
  shippingCharges: number,
  freeShipping: boolean
): number {
  if (freeShipping) return 0;
  if (!Number.isFinite(shippingCharges) || shippingCharges < 0) return 0;
  return roundMoney(shippingCharges);
}

export function formatDiscountBadge(discountPercent: number): string {
  const percent = clampDiscountPercent(discountPercent);
  if (percent <= 0) return "";
  return `-${Math.round(percent)}%`;
}
