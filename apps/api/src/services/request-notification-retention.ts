import { requestWorkNotificationsExpireAt } from "@service-desk/shared";
import type { DbCollections } from "../db/collections.js";

/** Планирует удаление всех in-app уведомлений по заявке через неделю после выполнения работ. */
export async function scheduleRequestWorkNotificationsExpiry(
  collections: DbCollections,
  requestId: string,
  completedAt: Date,
): Promise<void> {
  const expiresAt = requestWorkNotificationsExpireAt(completedAt);
  await collections.notifications.updateMany(
    { "meta.requestId": requestId },
    { $set: { expiresAt } },
  );
}
