import type { ObjectId } from "mongodb";
import type { Env } from "../config.js";
import type { DbCollections } from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import { isEmailConfigured } from "../lib/mail.js";
import { isTelegramBotConfigured } from "../lib/telegram.js";
import { normalizePhoneDigits, isValidWhatsAppPhone } from "../lib/phone.js";
import { sendWhatsAppRegistrationCode } from "../lib/whatsapp.js";
import {
  createTelegramRegistrationHandoff,
  type RegistrationCodeDelivery,
} from "./telegram-registration.js";

export type RegistrationDeliveryChannel = "email" | "telegram" | "whatsapp";

async function sendRegistrationCodeEmail(
  env: Env,
  email: string,
  code: string,
  token: string,
  intro: string,
) {
  const { sendEmail } = await import("../lib/mail.js");
  const verifyUrl = `${env.WEB_ORIGIN}/verify-email?token=${token}`;
  const formUrl = `${env.WEB_ORIGIN}/verify-email?email=${encodeURIComponent(email)}`;
  await sendEmail(
    env,
    email,
    "Код подтверждения регистрации",
    `${intro}

Код подтверждения: ${code}
Действует 15 минут.

Введите код на странице: ${formUrl}
Или перейдите по ссылке: ${verifyUrl}`,
  );
}

/** Код создаётся на бэкенде; доставка — email или Telegram (по запросу повторной отправки). */
export async function deliverRegistrationCode(
  collections: DbCollections,
  env: Env,
  opts: {
    channel: RegistrationDeliveryChannel;
    userId: ObjectId;
    email: string;
    phone?: string;
    code: string;
    token: string;
    intro: string;
  },
): Promise<RegistrationCodeDelivery> {
  const verifyEmailUrl = `${env.WEB_ORIGIN}/verify-email?email=${encodeURIComponent(opts.email)}`;

  if (opts.channel === "whatsapp") {
    if (!opts.phone) {
      throw new AppError(400, "Укажите телефон для WhatsApp");
    }
    const digits = normalizePhoneDigits(opts.phone);
    if (!isValidWhatsAppPhone(digits)) {
      throw new AppError(400, "Некорректный номер для WhatsApp");
    }
    await sendWhatsAppRegistrationCode(env, digits, opts.code, verifyEmailUrl);
    return {
      channel: "whatsapp",
      userMessage:
        "Код отправлен в WhatsApp. Введите его на сайте — аккаунт заказчика активируется.",
    };
  }

  if (opts.channel === "telegram") {
    if (!isTelegramBotConfigured(env)) {
      throw new AppError(503, "Telegram-бот не настроен");
    }
    const telegramBotUrl = await createTelegramRegistrationHandoff(
      collections,
      opts.userId,
      opts.code,
      env,
    );
    return {
      channel: "telegram",
      telegramBotUrl,
      userMessage:
        "Откройте Telegram-бота — код подтверждения придёт в чат. Затем введите его на сайте.",
    };
  }

  await sendRegistrationCodeEmail(
    env,
    opts.email,
    opts.code,
    opts.token,
    `${opts.intro}\n\nСтраница ввода кода: ${verifyEmailUrl}`,
  );

  let telegramBotUrl: string | undefined;
  if (!isEmailConfigured(env) && isTelegramBotConfigured(env)) {
    telegramBotUrl = await createTelegramRegistrationHandoff(
      collections,
      opts.userId,
      opts.code,
      env,
    );
  }

  return {
    channel: "email",
    telegramBotUrl,
    userMessage: isEmailConfigured(env)
      ? "На email отправлен код подтверждения. После ввода кода аккаунт будет активирован."
      : "Код сформирован на сервере (в dev — смотрите лог API). Можно получить тот же код через Telegram-бота.",
  };
}
