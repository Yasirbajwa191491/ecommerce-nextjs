const EMAIL_FROM_DISPLAY_REGEX =
  /^.+\s<[^\s<>]+@[^\s<>]+\.[^\s<>]+>$/;
const EMAIL_FROM_PLAIN_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RESEND_FROM_ENV_KEY = "RESEND_FROM_EMAIL";

export function isValidEmailFrom(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return (
    EMAIL_FROM_DISPLAY_REGEX.test(trimmed) ||
    EMAIL_FROM_PLAIN_REGEX.test(trimmed)
  );
}

export function validateEmailFromValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "Email from is required";
  if (!isValidEmailFrom(trimmed)) {
    return 'Use an email (you@domain.com) or "Store Name <you@domain.com>"';
  }
  return undefined;
}
