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

export function getFriendlyProductAiErrorMessage(
  error: string | undefined
): string {
  if (!error) {
    return "Content generation failed. Please retry.";
  }

  const lower = error.toLowerCase();

  if (lower.includes("timed out") && lower.includes("n8n")) {
    return "n8n did not finish in time. Confirm workflow 01 is active and CONVEX_SITE_URL in n8n uses your https://….convex.site URL (not .convex.cloud).";
  }

  if (
    lower.includes("429") &&
    (lower.includes("quota") ||
      lower.includes("resource_exhausted") ||
      lower.includes("free_tier"))
  ) {
    return "AI daily quota reached. Wait and retry, add another provider key in n8n, or switch to Gemini.";
  }

  if (
    lower.includes("429") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("504")
  ) {
    return "AI provider rate limit or overload (429). Wait a minute and retry, or switch to Gemini.";
  }

  if (error.length > 200) {
    return "Content generation failed due to a provider error. Check n8n execution logs.";
  }

  return error;
}
