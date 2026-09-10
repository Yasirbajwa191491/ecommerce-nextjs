/** In-app notification retention window (90 days). */
export const NOTIFICATION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export function computeNotificationExpiresAt(createdAt: number): number {
  return createdAt + NOTIFICATION_RETENTION_MS;
}
