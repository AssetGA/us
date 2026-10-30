/** Повторная отправка кода — только если с прошлого визита на сайт прошло больше этого интервала */
export const VERIFICATION_RESEND_ABSENCE_MS = 4 * 60 * 60 * 1000;

export function verificationResendAllowedAfterLastVisit(
  lastSiteVisitAt: Date | undefined,
  nowMs = Date.now(),
): boolean {
  if (!lastSiteVisitAt) return false;
  return nowMs - lastSiteVisitAt.getTime() > VERIFICATION_RESEND_ABSENCE_MS;
}

export function msUntilVerificationResendAllowed(
  lastSiteVisitAt: Date | undefined,
  nowMs = Date.now(),
): number {
  if (!lastSiteVisitAt) return VERIFICATION_RESEND_ABSENCE_MS;
  const elapsed = nowMs - lastSiteVisitAt.getTime();
  return Math.max(0, VERIFICATION_RESEND_ABSENCE_MS - elapsed);
}
