import type { Env } from "../config.js";

type TelegramEnv = Pick<Env, "TELEGRAM_BOT_TOKEN" | "TELEGRAM_BOT_USERNAME">;

export function normalizeTelegramBotUsername(botUsername: string): string {
  return botUsername.replace(/^@/, "").trim();
}

export function buildTelegramBotProfileUrl(botUsername: string): string {
  return `https://t.me/${normalizeTelegramBotUsername(botUsername)}`;
}

export function buildTelegramBotStartUrl(botUsername: string, startParam: string): string {
  return `${buildTelegramBotProfileUrl(botUsername)}?start=${encodeURIComponent(startParam)}`;
}

export function formatTelegramBotDisplayName(botUsername: string): string {
  const user = normalizeTelegramBotUsername(botUsername);
  return user ? `@${user}` : "";
}

export function isTelegramBotConfigured(env: TelegramEnv): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_BOT_USERNAME);
}

export async function sendTelegramMessage(
  env: TelegramEnv,
  chatId: number,
  text: string,
): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.info(`[telegram] To chat ${chatId}\n${text}`);
    return;
  }
  const res = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );
  if (!res.ok) {
    const errText = await res.text();
    console.error("[telegram] sendMessage failed:", errText);
    throw new Error("Не удалось отправить сообщение в Telegram");
  }
}
