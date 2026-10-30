"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { loginUrl, safeNextPath } from "@/lib/auth-redirect";

type Status = "idle" | "loading" | "success" | "error";
type VerifyChannel = "email" | "telegram" | "whatsapp";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";
  const emailParam = searchParams.get("email") ?? "";
  const botParam = searchParams.get("bot") ?? "";
  const verifyParam = (searchParams.get("verify") ?? "") as VerifyChannel | "";
  const nextAfterAuth = safeNextPath(searchParams.get("next"));

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [botUrl, setBotUrl] = useState(botParam);
  const [verifyChannel, setVerifyChannel] = useState<VerifyChannel>(
    verifyParam === "whatsapp" || verifyParam === "telegram" || verifyParam === "email"
      ? verifyParam
      : "telegram",
  );
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const customerMessengerVerify =
    verifyChannel === "whatsapp" || verifyChannel === "telegram";

  useEffect(() => {
    if (token) return;
    const e = (emailParam || email).trim();
    if (!e.includes("@")) return;
    let cancelled = false;
    api
      .verificationPresence(e)
      .then((res) => {
        if (cancelled) return;
        if (res.verifyChannel === "whatsapp" || res.verifyChannel === "telegram" || res.verifyChannel === "email") {
          setVerifyChannel(res.verifyChannel);
        }
        if (res.telegramBotUrl) setBotUrl(res.telegramBotUrl);
        if (res.codeResent) {
          setStatus("idle");
          setMessage(res.message ?? "Отправлен новый код — вы не заходили более 4 часов.");
        } else if (res.message) {
          setMessage((prev) => prev || res.message!);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- один раз при заходе с email из регистрации
  }, [token, emailParam]);

  useEffect(() => {
    if (!token) return;
    setStatus("loading");
    api
      .verifyEmail(token)
      .then((res) => {
        setStatus("success");
        setMessage(
          (res as { message?: string }).message ?? "Подтверждение выполнено.",
        );
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Не удалось подтвердить",
        );
      });
  }, [token]);

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = (await api.verifyEmailCode(email, code)) as {
        message?: string;
        active?: boolean;
      };
      setStatus("success");
      setMessage(res.message ?? "Аккаунт активирован.");
      if (res.active !== false) {
        setTimeout(() => router.push(loginUrl(nextAfterAuth)), 2000);
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Неверный код");
    }
  }

  async function resend(channel: VerifyChannel) {
    setStatus("loading");
    setMessage("");
    try {
      const res = await api.resendVerification(email, channel);
      setStatus("idle");
      if (res.verifyChannel) setVerifyChannel(res.verifyChannel as VerifyChannel);
      if (res.telegramBotUrl) setBotUrl(res.telegramBotUrl);
      setMessage(res.message ?? "Код отправлен повторно");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Ошибка отправки");
    }
  }

  const resendHint =
    "Повторный код (кнопки ниже) — только если с прошлого визита на сайт прошло более 4 часов. При новом заходе после перерыва код отправится автоматически.";

  if (token && status === "loading" && !message) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold">Подтверждение регистрации</h1>
        <p className="mt-4 text-sm text-slate-600">Проверяем ссылку…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold">Подтверждение регистрации</h1>
      <p className="mt-2 text-sm text-slate-600">
        {customerMessengerVerify
          ? verifyChannel === "whatsapp"
            ? "Код отправлен в WhatsApp на телефон, указанный при регистрации. Введите 6 цифр ниже."
            : "Код можно получить в Telegram-боте (кнопка ниже) или он уже пришёл в чат, если вы писали боту ранее."
          : "Сервер выдал код подтверждения. Введите его здесь — для исполнителя дополнительно нужно одобрение администратора."}
      </p>

      {verifyChannel === "telegram" && botUrl && status !== "success" && (
        <a
          href={botUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex w-full justify-center rounded-lg bg-[#229ED9] py-3 text-sm font-medium text-white hover:bg-[#1d8bc2]"
        >
          Открыть Telegram-бот
        </a>
      )}

      {message && (
        <p
          className={`mt-4 text-sm ${status === "success" ? "text-green-700" : status === "error" ? "text-red-600" : "text-slate-600"}`}
        >
          {message}
        </p>
      )}

      {!token && status !== "success" && (
        <form onSubmit={submitCode} className="mt-6 space-y-4">
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Код подтверждения
            <input
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-lg tracking-widest"
              placeholder="000000"
            />
          </label>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded bg-primary py-2 text-white hover:bg-primary-hover disabled:opacity-50"
          >
            Подтвердить
          </button>
          <p className="text-xs text-slate-500">{resendHint}</p>
          <div className="flex flex-col gap-2">
            {customerMessengerVerify ? (
              <>
                <button
                  type="button"
                  disabled={status === "loading" || !email}
                  onClick={() => resend(verifyChannel)}
                  className="w-full rounded border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {verifyChannel === "whatsapp"
                    ? "Отправить код в WhatsApp снова"
                    : "Получить код в Telegram снова"}
                </button>
                <button
                  type="button"
                  disabled={status === "loading" || !email}
                  onClick={() =>
                    resend(verifyChannel === "whatsapp" ? "telegram" : "whatsapp")
                  }
                  className="w-full rounded border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  {verifyChannel === "whatsapp"
                    ? "Отправить код в Telegram"
                    : "Отправить код в WhatsApp"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={status === "loading" || !email}
                  onClick={() => resend("email")}
                  className="w-full rounded border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Отправить код на email снова
                </button>
                <button
                  type="button"
                  disabled={status === "loading" || !email}
                  onClick={() => resend("telegram")}
                  className="w-full rounded border border-slate-300 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  Получить код через Telegram
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
        К входу
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense
        fallback={
          <div className="rounded-xl bg-white p-8 shadow-sm text-sm text-slate-600">
            Загрузка…
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
