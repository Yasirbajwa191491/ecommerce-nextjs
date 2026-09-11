export type PendingStripeOrder = {
  orderNumber: string;
  email: string;
  accessToken?: string;
  cartFingerprint?: string;
};

export function buildCheckoutCartFingerprint(args: {
  email: string;
  deliveryMethod?: string;
  lines: Array<{ productId: string; color: string; quantity: number }>;
}): string {
  const lines = [...args.lines]
    .map((line) => ({
      productId: line.productId.trim(),
      color: line.color.trim(),
      quantity: line.quantity,
    }))
    .sort((a, b) => {
      const left = `${a.productId}:${a.color}`;
      const right = `${b.productId}:${b.color}`;
      return left.localeCompare(right);
    });

  return JSON.stringify({
    email: args.email.trim().toLowerCase(),
    deliveryMethod: args.deliveryMethod ?? "",
    lines,
  });
}

export function pendingStripeOrderMatchesCart(
  pending: PendingStripeOrder | null,
  fingerprint: string
): boolean {
  if (!pending?.orderNumber || !pending.cartFingerprint) {
    return false;
  }
  return pending.cartFingerprint === fingerprint;
}
