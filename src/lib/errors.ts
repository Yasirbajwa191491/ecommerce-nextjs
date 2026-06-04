/** Normalize unknown thrown values into a user-safe message. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "An unexpected error occurred. Please try again.";
}

export function logAppError(
  error: unknown,
  context?: { segment?: string; digest?: string }
) {
  const message = getErrorMessage(error);
  console.error(
    context?.segment ? `[${context.segment}] ${message}` : message,
    error,
    context?.digest ? { digest: context.digest } : undefined
  );
}
