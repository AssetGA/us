"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { GuaranteedSpecialistBadge } from "@/components/GuaranteedSpecialistBadge";
import { api, type ApiUser } from "@/lib/api";

export default function AdminGuaranteedSpecialistsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [items, setItems] = useState<ApiUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback((q: string) => {
    const query: Record<string, string> = {
      contractorApproved: "true",
      limit: "500",
    };
    if (q.trim()) query.q = q.trim();
    return api.adminUsers(query).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  }, []);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        if (!u.roles.includes("admin")) {
          router.push("/dashboard");
          return null;
        }
        setUser(u);
        return load("");
      })
      .catch(() => router.push("/login"));
  }, [router, load]);

  const gsCount = useMemo(
    () => items.filter((u) => u.guaranteedSpecialist).length,
    [items],
  );

  async function toggleGs(target: ApiUser) {
    const next = !target.guaranteedSpecialist;
    const msg = next
      ? `Присвоить ${target.fullName} значок «ГС» (гарантированный специалист)?`
      : `Снять значок «ГС» у ${target.fullName}?`;
    if (!confirm(msg)) return;
    setError("");
    setBusyId(target.id);
    try {
      const { user: updated } = await api.setGuaranteedSpecialist(target.id, next);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить значок ГС");
    } finally {
      setBusyId(null);
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Гарантированные специалисты (ГС)</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-600">
        Значок <GuaranteedSpecialistBadge className="align-middle" /> отображается в{" "}
        <Link href="/browse/contractors" className="text-primary hover:underline">
          списке исполнителей
        </Link>
        . Присваивать и снимать его может только администратор; исполнитель должен быть уже{" "}
        <Link href="/admin/users" className="text-primary hover:underline">
          одобрен
        </Link>
        .
      </p>
      <p className="mt-1 text-sm text-slate-500">
        Сейчас с значком ГС: {gsCount} из {total} одобренных исполнителей
      </p>

      {error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setAppliedQ(search);
          load(search).catch(() => setError("Не удалось загрузить список"));
        }}
      >
        <label className="block min-w-[16rem] flex-1 text-sm">
          <span className="text-slate-600">Поиск по ФИО, email или организации</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Начните ввод…"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Найти
        </button>
        {appliedQ && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
            onClick={() => {
              setSearch("");
              setAppliedQ("");
              load("").catch(() => setError("Не удалось загрузить список"));
            }}
          >
            Сбросить
          </button>
        )}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Исполнитель</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">ГС</th>
              <th className="px-4 py-2 font-medium">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Одобренных исполнителей не найдено
                </td>
              </tr>
            )}
            {items.map((u) => {
              const busy = busyId === u.id;
              const blocked = u.status === "blocked";
              return (
                <tr key={u.id} className={blocked ? "bg-slate-50 text-slate-500" : undefined}>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
                      <span>{u.organizationName ?? u.fullName}</span>
                      {u.guaranteedSpecialist && <GuaranteedSpecialistBadge />}
                    </div>
                    {u.organizationName && (
                      <div className="text-xs text-slate-500">{u.fullName}</div>
                    )}
                    {blocked && (
                      <span className="text-xs text-red-600">заблокирован</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    {u.guaranteedSpecialist ? (
                      <span className="text-emerald-700">Да</span>
                    ) : (
                      <span className="text-slate-400">Нет</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {blocked ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        className="rounded-lg border border-emerald-600/30 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                        onClick={() => toggleGs(u)}
                      >
                        {u.guaranteedSpecialist ? "Снять ГС" : "Присвоить ГС"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
