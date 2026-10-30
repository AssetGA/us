"use client";

import Link from "next/link";
import { useState } from "react";
import { api, ApiValidationError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setError(Object.values(err.fields)[0] ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : "Не удалось отправить запрос");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Восстановление пароля</h1>

        {sent ? (
          <>
            <p className="text-sm text-slate-700">
              Если этот email зарегистрирован, мы отправили ссылку для сброса пароля. Ссылка
              действует 1 час. Проверьте почту (и папку «Спам»).
            </p>
            <p className="text-xs text-slate-500">
              В режиме разработки без SMTP текст письма пишется в консоль API.
            </p>
            <Link href="/login" className="inline-block text-sm text-primary hover:underline">
              Вернуться ко входу
            </Link>
          </>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Укажите email аккаунта — мы пришлём ссылку для нового пароля.
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <label className="block text-sm">
              Email
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-primary py-2 text-white hover:bg-primary-hover disabled:opacity-50"
            >
              {loading ? "Отправка…" : "Отправить ссылку"}
            </button>
            <p className="text-center text-sm">
              <Link href="/login" className="text-primary hover:underline">
                Назад ко входу
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
