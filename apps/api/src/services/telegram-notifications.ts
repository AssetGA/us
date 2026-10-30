import type { ObjectId } from "mongodb";
import type { Env } from "../config.js";
import type { DbCollections, UserDoc } from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import { isTelegramBotConfigured, sendTelegramMessage } from "../lib/telegram.js";
import { contractorMatchesCategory } from "./request-offers.js";
import type { ServiceRequestDoc } from "../db/collections.js";

export function isTelegramRequiredForWorkNotifications(env: Env): boolean {
  return isTelegramBotConfigured(env);
}

export function assertTelegramLinkedIfRequired(
  env: Env,
  user: UserDoc,
  purposeMessage: string,
): void {
  if (!isTelegramRequiredForWorkNotifications(env)) return;
  if (!user.telegramId) {
    throw new AppError(
      403,
      `${purposeMessage} Привяжите Telegram в профиле (раздел «Telegram-оповещения»).`,
    );
  }
}

export async function sendTelegramNotificationCopy(
  env: Env,
  chatId: number,
  title: string,
  body: string,
  webOrigin?: string,
  requestId?: string,
): Promise<void> {
  let text = `${title}\n${body}`;
  if (requestId && webOrigin) {
    text += `\n\n${webOrigin}/requests/${requestId}`;
  }
  try {
    await sendTelegramMessage(env, chatId, text);
  } catch (e) {
    console.error("[telegram] notification delivery failed:", e);
  }
}

export async function deliverTelegramForUser(
  collections: DbCollections,
  env: Env,
  userId: ObjectId,
  title: string,
  body: string,
  meta?: Record<string, unknown>,
  webOrigin?: string,
): Promise<void> {
  if (!isTelegramBotConfigured(env)) return;
  const user = await collections.users.findOne({ _id: userId });
  if (!user?.telegramId) return;
  const requestId =
    meta?.requestId && typeof meta.requestId === "string" ? meta.requestId : undefined;
  await sendTelegramNotificationCopy(env, user.telegramId, title, body, webOrigin, requestId);
}

export async function notifyMatchingContractorsNewRequest(
  collections: DbCollections,
  _env: Env,
  _webOrigin: string,
  request: ServiceRequestDoc,
  number: string,
  title: string,
  createInApp: (
    userId: ObjectId,
    type: string,
    nTitle: string,
    nBody: string,
    meta: Record<string, unknown>,
  ) => Promise<void>,
): Promise<void> {
  const contractors = await collections.users
    .find({
      roles: "contractor",
      status: "active",
      contractorApprovedAt: { $exists: true },
      serviceCategoryIds: request.categoryId,
    })
    .toArray();

  const requestId = request._id!.toString();
  const nTitle = "Новый заказ";
  const nBody = `${number}: ${title}`;

  for (const contractor of contractors) {
    if (!contractorMatchesCategory(contractor, request)) continue;
    await createInApp(contractor._id!, "request.new_market", nTitle, nBody, { requestId });
  }
}
