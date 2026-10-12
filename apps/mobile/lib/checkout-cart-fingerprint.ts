export type PendingStripeOrder = {
  orderNumber: string;
  email: string;
  accessToken?: string;
  cartFingerprint?: string;
};

export function buildCheckoutCartFingerprint(args: {
  email: string;
  customer: { fullName: string; phone: string; address: string; notes?: string };
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
    version: 2,
    email: args.email.trim().toLowerCase(),
    customer: {
      fullName: args.customer.fullName.trim(),
      phone: args.customer.phone.trim(),
      address: args.customer.address.trim(),
      notes: args.customer.notes?.trim() ?? "",
    },
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
