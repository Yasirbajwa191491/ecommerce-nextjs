const FRIENDLY_ERROR_MAP: Record<string, string> = {
  "You cannot ban yourself": "You can't ban your own account.",
  "You cannot delete yourself": "You can't delete your own account.",
  "Admin access required": "You don't have permission to access the admin area.",
  "Super admin access required": "Only a super admin can perform this action.",
  "Not authenticated": "Please sign in to continue.",
  "Account is banned": "This account has been banned.",
  "Only super admins can assign admin roles":
    "Only a super admin can assign admin or super admin roles.",
};

/** Raw message from Error or string (may include Convex boilerplate). */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  return "An unexpected error occurred. Please try again.";
}

/** Strip Convex / server noise and return a clean message for UI alerts. */
export function getFriendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  const raw = getErrorMessage(error);
  const parsed = parseServerErrorMessage(raw);
  const mapped = FRIENDLY_ERROR_MAP[parsed] ?? FRIENDLY_ERROR_MAP[raw];
  if (mapped) return mapped;

  if (parsed.length > 0 && parsed.length < 280 && !looksLikeRawServerDump(parsed)) {
    return parsed;
  }

  return fallback;
}

function looksLikeRawServerDump(message: string): boolean {
  return (
    /\[CONVEX/i.test(message) ||
    /Request ID:/i.test(message) ||
    /at async handler/i.test(message) ||
    /Called by client/i.test(message)
  );
}

function parseServerErrorMessage(raw: string): string {
  let message = raw.trim();

  message = message
    .replace(/\[CONVEX[^\]]*\]\s*/gi, "")
    .replace(/\[Request ID:[^\]]*\]\s*/gi, "")
    .replace(/\s*Called by client\s*$/i, "")
    .trim();

  const uncaught = message.match(
    /Uncaught\s+(?:APIError|ConvexError|Error):\s*(.+?)(?:\s+at\s+async|\s+at\s+|\s*$)/i
  );
  if (uncaught?.[1]) {
    return cleanTrailingStack(uncaught[1].trim());
  }

  if (/^Server Error\s*/i.test(message)) {
    message = message.replace(/^Server Error\s*/i, "").trim();
    const afterColon = message.match(/^(?:Uncaught\s+)?(?:\w+Error):\s*(.+)$/i);
    if (afterColon?.[1]) {
      return cleanTrailingStack(afterColon[1].trim());
    }
  }

  const adminPrefix = message.match(
    /Admin access required\.\s*Your account role is "[^"]+"\.\s*(.+)$/i
  );
  if (adminPrefix?.[1]) {
    return adminPrefix[1].trim();
  }

  if (message.startsWith("Admin access required")) {
    return "You don't have permission to access the admin area.";
  }

  return cleanTrailingStack(message);
}

function cleanTrailingStack(message: string): string {
  return message
    .replace(/\s+at\s+async\s+handler.*$/i, "")
    .replace(/\s+at\s+.+:\d+:\d+.*$/i, "")
    .trim();
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
