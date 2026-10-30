import type { ObjectId } from "mongodb";
import {
  msUntilVerificationResendAllowed,
  verificationResendAllowedAfterLastVisit,
} from "@service-desk/shared";
import type { Env } from "../config.js";
import type { DbCollections, UserDoc } from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import type { RegistrationDeliveryChannel } from "./registration-delivery.js";
import { deliverRegistrationCode } from "./registration-delivery.js";

function formatWaitMs(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  if (totalMin >= 60) {
    const h = Math.ceil(totalMin / 60);
    return `${h} ч.`;
  }
  return `${totalMin} мин.`;
}

export function assertVerificationResendAllowed(user: UserDoc): void {
  if (!user.verificationSiteLastSeenAt) {
    throw new AppError(
      400,
      "Повторный код доступен после повторного захода на сайт, если с прошлого визита прошло более 4 часов. Сейчас используйте код из первой регистрации.",
    );
  }
  if (!verificationResendAllowedAfterLastVisit(user.verificationSiteLastSeenAt)) {
    const wait = formatWaitMs(
      msUntilVerificationResendAllowed(user.verificationSiteLastSeenAt),
    );
    throw new AppError(
      429,
      `Новый код можно запросить, если вы не заходили на сайт более 4 часов. Подождите ещё около ${wait}.`,
    );
  }
}

export function resolveVerificationDeliveryChannel(
  user: UserDoc,
  requested: RegistrationDeliveryChannel,
): RegistrationDeliveryChannel {
  const isCustomerReg = user.roles.includes("employee");
  if (isCustomerReg && requested === "email") {
    return user.registrationVerifyChannel === "whatsapp" ? "whatsapp" : "telegram";
  }
  return requested;
}

export async function sendVerificationCodeResend(
  collections: DbCollections,
  env: Env,
  user: UserDoc,
  createVerification: (userId: ObjectId) => Promise<{ code: string; token: string }>,
  channel: RegistrationDeliveryChannel,
  intro: string,
) {
  const deliveryChannel = resolveVerificationDeliveryChannel(user, channel);
  const { code, token } = await createVerification(user._id!);
  const delivery = await deliverRegistrationCode(collections, env, {
    channel: deliveryChannel,
    userId: user._id!,
    email: user.email,
    phone: user.phone,
    code,
    token,
    intro,
  });
  const now = new Date();
  await collections.users.updateOne(
    { _id: user._id },
    {
      $set: {
        verificationSiteLastSeenAt: now,
        verificationCodeSentAt: now,
        registrationVerifyChannel: delivery.channel,
        updatedAt: now,
      },
    },
  );
  return delivery;
}

/** Фиксирует визит на странице подтверждения; при отсутствии > 4 ч — отправляет новый код */
export async function recordVerificationSitePresence(
  collections: DbCollections,
  env: Env,
  user: UserDoc,
  createVerification: (userId: ObjectId) => Promise<{ code: string; token: string }>,
) {
  const prevSeen = user.verificationSiteLastSeenAt;
  const shouldResend = verificationResendAllowedAfterLastVisit(prevSeen);
  const now = new Date();

  if (shouldResend) {
    const channel =
      user.registrationVerifyChannel ??
      (user.roles.includes("employee") ? "telegram" : "email");
    const delivery = await sendVerificationCodeResend(
      collections,
      env,
      user,
      createVerification,
      channel,
      "Вы снова зашли на сайт после долгого перерыва — новый код подтверждения.",
    );
    return {
      codeResent: true as const,
      message: delivery.userMessage,
      verifyChannel: delivery.channel,
      telegramBotUrl: delivery.telegramBotUrl,
    };
  }

  await collections.users.updateOne(
    { _id: user._id },
    { $set: { verificationSiteLastSeenAt: now, updatedAt: now } },
  );

  return {
    codeResent: false as const,
    message:
      prevSeen === undefined
        ? "Используйте код из регистрации. Новый код можно получить после повторного визита, если с прошлого захода прошло более 4 часов."
        : "Новый код будет отправлен автоматически, если вы зайдёте снова спустя более 4 часов с прошлого визита.",
  };
}
