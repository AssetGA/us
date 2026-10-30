import "./load-env.js";
import { Telegraf, Markup } from "telegraf";

const token = process.env.TELEGRAM_BOT_TOKEN;
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const botSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";

if (!token) {
  console.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
  process.exit(0);
}

const bot = new Telegraf(token);

async function deliverRegistrationHandoff(ctx: import("telegraf").Context, startToken: string) {
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  try {
    const res = await fetch(`${apiUrl}/api/v1/telegram/registration-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-secret": botSecret,
      },
      body: JSON.stringify({ startToken, telegramId }),
    });
    if (!res.ok) {
      await ctx.reply(
        "Ссылка устарела или уже использована. На сайте нажмите «Отправить код снова» или зарегистрируйтесь заново.",
      );
      return;
    }
    await ctx.reply(
      "Код подтверждения отправлен в этот чат. Введите его на сайте в разделе подтверждения регистрации.",
    );
  } catch {
    await ctx.reply("Не удалось связаться с сервером. Попробуйте позже.");
  }
}

bot.start(async (ctx) => {
  const payload = ctx.startPayload?.trim();
  if (payload?.startsWith("reg_")) {
    await deliverRegistrationHandoff(ctx, payload);
    return;
  }
  await ctx.reply(
    "Сервис заявок.\n\n• Подтверждение регистрации: откройте ссылку с сайта — код выдаёт сервер.\n• Привязка аккаунта: /link КОД из профиля.\n\nСайт:",
    Markup.inlineKeyboard([Markup.button.url("Открыть приложение", webOrigin)]),
  );
});

bot.hears(/^\/link\s+([A-F0-9]+)$/i, async (ctx) => {
  const code = ctx.match[1].toUpperCase();
  const telegramId = ctx.from?.id;
  if (!telegramId) return;
  try {
    const res = await fetch(`${apiUrl}/api/v1/telegram/confirm-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, telegramId }),
    });
    if (!res.ok) {
      await ctx.reply("Код недействителен или истёк. Запросите новый в профиле.");
      return;
    }
    await ctx.reply("Telegram успешно привязан к учётной записи.");
  } catch {
    await ctx.reply("Не удалось связаться с сервером. Попробуйте позже.");
  }
});

bot.launch().then(() => console.info("Telegram bot started"));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
