import { randomBytes } from "crypto";
import type { ObjectId } from "mongodb";
import type { DbCollections } from "../db/collections.js";
import type { Env } from "../config.js";
import {
  buildTelegramBotStartUrl,
  isTelegramBotConfigured,
  sendTelegramMessage,
} from "../lib/telegram.js";
import { AppError } from "../lib/errors.js";

const HANDOFF_TTL_MS = 15 * 60 * 1000;

export async function createTelegramRegistrationHandoff(
  collections: DbCollections,
  userId: ObjectId,
  code: string,
  env: Env,
): Promise<string> {
  if (!isTelegramBotConfigured(env)) {
    throw new AppError(
      503,
      "Telegram-бот не настроен (TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME)",
    );
  }
  await collections.telegramRegistrationHandoffs.updateMany(
    { userId, deliveredAt: { $exists: false } },
    { $set: { deliveredAt: new Date() } },
  );
  const startToken = `reg_${randomBytes(12).toString("hex")}`;
  await collections.telegramRegistrationHandoffs.insertOne({
    userId,
    startToken,
    code,
    expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
  });
  return buildTelegramBotStartUrl(env.TELEGRAM_BOT_USERNAME!, startToken);
}

export async function deliverRegistrationCodeViaTelegramBot(
  collections: DbCollections,
  env: Env,
  startToken: string,
  telegramId: number,
): Promise<void> {
  const handoff = await collections.telegramRegistrationHandoffs.findOne({
    startToken,
    expiresAt: { $gt: new Date() },
    deliveredAt: { $exists: false },
  });
  if (!handoff) {
    throw new AppError(400, "Ссылка недействительна или код уже выдан");
  }
  const verifyUrl = `${env.WEB_ORIGIN}/verify-email?email=`;
  const user = await collections.users.findOne({ _id: handoff.userId });
  const text = `Service Desk — код подтверждения регистрации: ${handoff.code}\n\nДействует 15 минут.\nВведите на сайте: ${verifyUrl}${encodeURIComponent(user?.email ?? "")}`;

  await sendTelegramMessage(env, telegramId, text);
  await collections.users.updateOne(
    { _id: handoff.userId },
    { $set: { telegramId, updatedAt: new Date() } },
  );
  await collections.telegramRegistrationHandoffs.updateOne(
    { _id: handoff._id },
    { $set: { telegramId, deliveredAt: new Date() } },
  );
}

export type VerifyDeliveryChannel = "email" | "telegram" | "whatsapp";

export type RegistrationCodeDelivery = {
  channel: VerifyDeliveryChannel;
  telegramBotUrl?: string;
  userMessage: string;
};
