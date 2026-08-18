/**
 * Better Auth `emailOTP` plugin uses a single `expiresIn` for every OTP type.
 * Password reset requires 24 hours; login and email verification share the same window.
 */
export const OTP_EXPIRES_SECONDS = 24 * 60 * 60;
export const OTP_EXPIRES_MINUTES = OTP_EXPIRES_SECONDS / 60;
export const OTP_EXPIRES_HOURS = OTP_EXPIRES_SECONDS / 3600;

export function getOtpExpiresAt(sentAtMs: number): number {
  return sentAtMs + OTP_EXPIRES_SECONDS * 1000;
}

export function formatOtpExpiryDuration(): string {
  if (OTP_EXPIRES_SECONDS >= 3600) {
    const hours = OTP_EXPIRES_SECONDS / 3600;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${OTP_EXPIRES_MINUTES} minutes`;
}

export function formatOtpExpiryTime(sentAtMs: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  }).format(new Date(getOtpExpiresAt(sentAtMs)));
}

export function formatOtpRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
