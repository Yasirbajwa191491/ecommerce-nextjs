export type WebhookEventClaim = {
  processedAt?: number;
  status?: "pending" | "processed" | "failed";
};

/** Receipt is not completion. Failed or unfinished events must be replayed. */
export function webhookEventClaimAction(
  existing: WebhookEventClaim | null
): "process" | "duplicate" {
  if (!existing) return "process";
  if (existing.status === "pending" || existing.status === "failed") return "process";
  if (existing.status === "processed") return "duplicate";
  if (existing.processedAt != null) return "duplicate";
  return "process";
}
