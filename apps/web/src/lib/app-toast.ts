import { toast } from "sonner";
import { getFriendlyErrorMessage } from "@/lib/errors";

type ToastErrorOptions = {
  /** Short headline shown above the message */
  title?: string;
  /** Used when the error cannot be parsed */
  fallback?: string;
};

type ToastSuccessOptions = {
  description?: string;
};

/** User-facing error alert (strips Convex / server noise). */
export function toastError(error: unknown, options?: ToastErrorOptions) {
  const fallback =
    options?.fallback ?? "Something went wrong. Please try again.";
  const message =
    error === null || error === undefined
      ? fallback
      : getFriendlyErrorMessage(error, fallback);
  const title = options?.title ?? defaultErrorTitle(message);

  toast.error(title, {
    description: message,
    duration: 6000,
  });
}

/** User-facing success alert. */
export function toastSuccess(message: string, options?: ToastSuccessOptions) {
  toast.success(message, {
    description: options?.description,
    duration: 4000,
  });
}

function defaultErrorTitle(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("not authenticated") || lower.includes("sign in")) {
    return "Sign in required";
  }
  if (lower.includes("admin access") || lower.includes("super admin")) {
    return "Permission denied";
  }
  if (
    lower.includes("ban yourself") ||
    lower.includes("can't ban") ||
    lower.includes("delete yourself") ||
    lower.includes("can't delete your own")
  ) {
    return "Action not allowed";
  }
  if (lower.includes("invalid") || lower.includes("required")) {
    return "Check your input";
  }
  return "Something went wrong";
}
