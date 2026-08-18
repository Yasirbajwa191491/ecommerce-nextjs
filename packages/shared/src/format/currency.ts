export const DEFAULT_CURRENCY = "USD";

export function formatCurrencyAmount(
  amount: number,
  currency: string = DEFAULT_CURRENCY
): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
