import nodemailer from "nodemailer";
import type { Env } from "../config.js";
import { AppError } from "./errors.js";

function smtpPassword(env: Env): string | undefined {
  return env.SMTP_PASSWORD ?? env.SMTP_PASS;
}

function smtpFrom(env: Env): string | undefined {
  return env.SMTP_FROM ?? env.EMAIL_FROM;
}

export function isEmailConfigured(env: Env): boolean {
  const user = env.SMTP_USER?.trim();
  const password = smtpPassword(env)?.trim();
  const from = smtpFrom(env)?.trim();
  return Boolean(user && password && from);
}

function assertSmtpEnv(env: Env): { user: string; password: string; from: string } {
  const user = env.SMTP_USER?.trim();
  const password = smtpPassword(env)?.trim();
  const from = smtpFrom(env)?.trim();
  if (!user || !password || !from) {
    throw new Error("SMTP environment variables are missing");
  }
  return { user, password, from };
}

function createTransporter(env: Env) {
  const { user, password } = assertSmtpEnv(env);
  const port = env.SMTP_PORT ?? 465;
  return nodemailer.createTransport({
    host: env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user,
      pass: password,
    },
  });
}

export async function verifyEmailTransport(env: Env): Promise<void> {
  await createTransporter(env).verify();
}

export async function logEmailStartupStatus(env: Env): Promise<void> {
  if (!isEmailConfigured(env)) {
    console.info(
      "[email] SMTP не настроен — коды регистрации исполнителя пишутся в лог API (или Telegram fallback).",
    );
    return;
  }
  try {
    await verifyEmailTransport(env);
    console.info("[email] SMTP подключение проверено успешно.");
  } catch (err) {
    console.error(
      "[email] SMTP настроен, но verify() не прошёл — проверьте SMTP_* в .env:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!isEmailConfigured(env)) {
    console.info(`[email] To: ${to}\nSubject: ${subject}\n${text}`);
    return;
  }
  const { from } = assertSmtpEnv(env);
  try {
    await createTransporter(env).sendMail({
      from,
      to,
      subject,
      text,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new AppError(
      502,
      `Не удалось отправить письмо. Проверьте SMTP (Gmail — пароль приложения, SMTP_FROM совпадает с пользователем). ${detail}`,
    );
  }
}
