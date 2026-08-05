export const DEFAULT_NOTIFICATION_MAX_ATTEMPTS = 3;

export function calculateNotificationRetryDelayMs(attemptCount: number) {
  const normalizedAttempt = Math.max(1, attemptCount);
  return Math.min(24 * 60 * 60 * 1000, 60 * 60 * 1000 * 2 ** (normalizedAttempt - 1));
}

export function calculateNextNotificationRetryAt(attemptCount: number, now = new Date()) {
  return new Date(now.getTime() + calculateNotificationRetryDelayMs(attemptCount)).toISOString();
}

export function resolveNotificationFailureStatus(attemptCount: number, maxAttempts = DEFAULT_NOTIFICATION_MAX_ATTEMPTS) {
  return attemptCount >= maxAttempts ? "permanently_failed" : "failed";
}
