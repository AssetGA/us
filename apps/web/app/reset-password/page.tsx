"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api, ApiValidationError } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Ссылка недействительна: нет токена. Запросите восстановление пароля снова.");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }
    if (password !== password2) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      router.push("/login?reset=ok");
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setError(Object.values(err.fields)[0] ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : "Не удалось сменить пароль");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Новый пароль</h1>
        <p className="text-sm text-red-600">
          Ссылка неполная или устарела. Запросите восстановление пароля ещё раз.
        </p>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          Забыли пароль?
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-sm"
    >
      <h1 className="text-2xl font-semibold">Новый пароль</h1>
      <p className="text-sm text-slate-600">Придумайте новый пароль для входа в аккаунт.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <label className="block text-sm">
        Новый пароль
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm">
        Повторите пароль
        <input
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
          minLength={8}
          autoComplete="new-password"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-primary py-2 text-white hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Сохранение…" : "Сохранить пароль"}
      </button>
      <p className="text-center text-sm">
        <Link href="/login" className="text-primary hover:underline">
          Ко входу
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <Suspense fallback={<div className="text-sm text-slate-600">Загрузка…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
