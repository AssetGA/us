"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminSchema, zodToFieldErrors } from "@service-desk/shared";
import { AppShell } from "@/components/AppShell";
import { api, type ApiUser } from "@/lib/api";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  asDispatcher: boolean;
};

export default function AdminAdminsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [items, setItems] = useState<ApiUser[]>([]);
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    password: "",
    asDispatcher: true,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [message, setMessage] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  function reloadAdmins() {
    return api.adminList().then((r) => setItems(r.items));
  }

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        if (!u.isSuperAdmin) {
          router.push("/dashboard");
          return null;
        }
        setUser(u);
        return reloadAdmins();
      })
      .catch(() => router.push("/login"));
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setTempPassword(null);
    const payload = {
      fullName: form.fullName,
      email: form.email,
      asDispatcher: form.asDispatcher,
      ...(form.password.trim() ? { password: form.password } : {}),
    };
    const parsed = createAdminSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(zodToFieldErrors(parsed.error) as Partial<Record<keyof FormState, string>>);
      return;
    }
    setFieldErrors({});
    try {
      const res = await api.createAdmin(parsed.data);
      setMessage(`Администратор ${res.user.email} создан`);
      if (res.temporaryPassword) setTempPassword(res.temporaryPassword);
      setForm({ fullName: "", email: "", password: "", asDispatcher: true });
      await reloadAdmins();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ошибка");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Администраторы</h1>
      <p className="mt-2 text-sm text-slate-600">
        Главный администратор может добавлять других админов. Они смогут одобрять исполнителей и
        управлять пользователями в разделе «Пользователи».
      </p>

      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-3 rounded-lg border bg-white p-4">
        <h2 className="font-medium">Новый администратор</h2>
        <label className="block text-sm">
          ФИО *
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          {fieldErrors.fullName && (
            <p className="text-sm text-red-600">{fieldErrors.fullName}</p>
          )}
        </label>
        <label className="block text-sm">
          Email *
          <input
            type="email"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
        </label>
        <label className="block text-sm">
          Пароль (если пусто — сгенерируется и отправится на email)
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {fieldErrors.password && (
            <p className="text-sm text-red-600">{fieldErrors.password}</p>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.asDispatcher}
            onChange={(e) => setForm({ ...form, asDispatcher: e.target.checked })}
          />
          Доступ к панели заявок (роль диспетчера)
        </label>
        <button type="submit" className="rounded bg-primary px-4 py-2 text-sm text-white">
          Создать администратора
        </button>
        {message && <p className="text-sm text-slate-700">{message}</p>}
        {tempPassword && (
          <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
            Временный пароль (также отправлен на почту):{" "}
            <span className="font-mono">{tempPassword}</span>
          </p>
        )}
      </form>

      <ul className="mt-8 divide-y rounded-lg border bg-white">
        {items.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <div className="font-medium">{a.fullName}</div>
              <div className="text-sm text-slate-600">{a.email}</div>
              <div className="text-xs text-slate-500">
                {a.isSuperAdmin ? "Главный администратор" : "Администратор"}
                {a.roles.includes("dispatcher") ? " · диспетчер" : ""}
              </div>
            </div>
            {!a.isSuperAdmin && a.id !== user.id && (
              <button
                type="button"
                className="text-sm text-red-600"
                onClick={async () => {
                  if (!confirm(`Снять права администратора у ${a.email}?`)) return;
                  await api.revokeAdmin(a.id);
                  await reloadAdmins();
                }}
              >
                Снять права
              </button>
            )}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
