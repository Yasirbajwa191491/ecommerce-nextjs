/** Must match `expiresIn` on the Better Auth `emailOTP` plugin (seconds). */
export const OTP_EXPIRES_SECONDS = 30 * 60;
export const OTP_EXPIRES_MINUTES = OTP_EXPIRES_SECONDS / 60;

export function getOtpExpiresAt(sentAtMs: number): number {
  return sentAtMs + OTP_EXPIRES_SECONDS * 1000;
}

export function formatOtpExpiryTime(sentAtMs: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(getOtpExpiresAt(sentAtMs)));
}

export function formatOtpRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
