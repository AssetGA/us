/** После выполнения работ уведомления по этой заявке удаляются через 7 дней */
export const REQUEST_WORK_NOTIFICATION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function requestWorkNotificationsExpireAt(completedAt: Date): Date {
  return new Date(completedAt.getTime() + REQUEST_WORK_NOTIFICATION_RETENTION_MS);
}
