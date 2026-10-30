import type { ObjectId } from "mongodb";
import type { Env } from "../config.js";
import type { DbCollections, NotificationInsert } from "../db/collections.js";
import { deliverTelegramForUser } from "../services/telegram-notifications.js";

export type NotificationDelivery = {
  env?: Env;
  webOrigin?: string;
  /** По умолчанию Telegram дублируется, если бот настроен и у пользователя есть telegramId */
  skipTelegram?: boolean;
};

export async function createNotification(
  collections: DbCollections,
  params: {
    userId: ObjectId;
    type: string;
    title: string;
    body: string;
    meta?: Record<string, unknown>;
    expiresAt?: Date;
  },
  delivery?: NotificationDelivery,
): Promise<void> {
  const doc: NotificationInsert = {
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    meta: params.meta,
    createdAt: new Date(),
    ...(params.expiresAt ? { expiresAt: params.expiresAt } : {}),
  };
  await collections.notifications.insertOne(doc);

  if (delivery?.skipTelegram || !delivery?.env) return;

  await deliverTelegramForUser(
    collections,
    delivery.env,
    params.userId,
    params.title,
    params.body,
    params.meta,
    delivery.webOrigin,
  );
}
