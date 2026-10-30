import { Router } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { requireAuth } from "../middleware/context.js";
import { sendError, AppError } from "../lib/errors.js";
import type { TelegramLinkInsert } from "../db/collections.js";
import { deliverRegistrationCodeViaTelegramBot } from "../services/telegram-registration.js";
import {
  buildTelegramBotProfileUrl,
  formatTelegramBotDisplayName,
  isTelegramBotConfigured,
} from "../lib/telegram.js";

const registrationHandoffSchema = z.object({
  startToken: z.string().min(4),
  telegramId: z.number(),
});

function assertBotSecret(req: import("express").Request) {
  const secret = req.headers["x-telegram-bot-secret"];
  const expected = req.appLocals.env.TELEGRAM_WEBHOOK_SECRET;
  if (expected && secret !== expected) {
    throw new AppError(403, "Invalid bot secret");
  }
  if (!expected && req.appLocals.env.NODE_ENV === "production") {
    throw new AppError(403, "TELEGRAM_WEBHOOK_SECRET required");
  }
  // dev: без секрета разрешаем локальному боту
}

const router = Router();

const confirmLinkSchema = z.object({
  code: z.string().min(4),
  telegramId: z.number(),
});

function canLinkTelegramForNotifications(roles: string[]): boolean {
  return roles.includes("employee") || roles.includes("contractor");
}

router.post("/link", requireAuth, async (req, res) => {
  try {
    const env = req.appLocals.env;
    if (!canLinkTelegramForNotifications(req.user!.roles)) {
      throw new AppError(403, "Привязка Telegram недоступна для этой роли");
    }
    if (!isTelegramBotConfigured(env)) {
      throw new AppError(
        503,
        "Telegram-бот не настроен (TELEGRAM_BOT_TOKEN и TELEGRAM_BOT_USERNAME в .env)",
      );
    }
    const code = randomBytes(4).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const link: TelegramLinkInsert = {
      userId: req.user!._id!,
      code,
      expiresAt,
    };
    await req.appLocals.collections.telegramLinks.insertOne(link);
    const botUsername = formatTelegramBotDisplayName(env.TELEGRAM_BOT_USERNAME!);
    res.json({
      code,
      botUsername,
      botUrl: buildTelegramBotProfileUrl(env.TELEGRAM_BOT_USERNAME!),
      message: "Отправьте команду /link боту в Telegram в течение 10 минут",
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/registration-handoff", async (req, res) => {
  try {
    assertBotSecret(req);
    const body = registrationHandoffSchema.parse(req.body);
    await deliverRegistrationCodeViaTelegramBot(
      req.appLocals.collections,
      req.appLocals.env,
      body.startToken,
      body.telegramId,
    );
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/confirm-link", async (req, res) => {
  try {
    const body = confirmLinkSchema.parse(req.body);
    const code = body.code.toUpperCase();
    const link = await req.appLocals.collections.telegramLinks.findOne({
      code,
      expiresAt: { $gt: new Date() },
      linkedAt: { $exists: false },
    });
    if (!link) throw new AppError(400, "Invalid or expired code");
    await req.appLocals.collections.users.updateOne(
      { _id: link.userId },
      { $set: { telegramId: body.telegramId, updatedAt: new Date() } },
    );
    await req.appLocals.collections.telegramLinks.updateOne(
      { _id: link._id },
      { $set: { telegramId: body.telegramId, linkedAt: new Date() } },
    );
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const secret = req.headers["x-telegram-bot-api-secret-token"];
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      throw new AppError(403, "Invalid webhook secret");
    }
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
