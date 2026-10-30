"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api";
import { safeNextPath } from "@/lib/auth-redirect";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const resetOk = searchParams.get("reset") === "ok";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.login(email, password);
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold">Вход</h1>
      {resetOk && (
        <p className="text-sm text-green-700">Пароль обновлён. Войдите с новым паролем.</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <label className="block text-sm">
        Email
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label className="block text-sm">
        Пароль
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button
        type="submit"
        className="w-full rounded bg-primary py-2 text-white hover:bg-primary-hover"
      >
        Войти
      </button>
      <p className="text-center text-sm text-slate-600">
        <Link href={`/register${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-primary hover:underline">
          Регистрация
        </Link>
        {" · "}
        <Link href="/" className="text-primary hover:underline">
          На главную
        </Link>
        {" · "}
        <Link href="/forgot-password" className="text-primary hover:underline">
          Забыли пароль?
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<div className="text-sm text-slate-600">Загрузка…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
