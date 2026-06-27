import {
  FRIENDLY_QUOTA_MESSAGE,
  FRIENDLY_TRANSIENT_MESSAGE,
} from "../../convex/lib/reviewAiQueue";

export function getFriendlyAiErrorMessage(
  error: string | undefined,
  status?: string
): string {
  if (status === "retry_scheduled") {
    return FRIENDLY_QUOTA_MESSAGE;
  }
  if (!error) {
    return "AI analysis failed. Please retry manually.";
  }

  const lower = error.toLowerCase();
  if (
    lower.includes("429") &&
    (lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("free_tier"))
  ) {
    return FRIENDLY_QUOTA_MESSAGE;
  }
  if (
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504") ||
    (lower.includes("429") && !lower.includes("quota"))
  ) {
    return FRIENDLY_TRANSIENT_MESSAGE;
  }

  if (error.length > 200) {
    return "AI analysis failed due to a provider error. Please retry.";
  }

  return error;
}

export function formatRetryScheduledTime(nextRetryAt?: number): string | null {
  if (!nextRetryAt) return null;
  const date = new Date(nextRetryAt);
  return date.toLocaleString();
}
