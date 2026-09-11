const RETRYABLE_PAYMENT_INTENT_STATUSES = [
  "requires_payment_method",
  "requires_confirmation",
  "requires_action",
  "processing",
] as const;

export function isRetryablePaymentIntentStatus(status: string): boolean {
  return (RETRYABLE_PAYMENT_INTENT_STATUSES as readonly string[]).includes(status);
}
