"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { GuaranteedSpecialistBadge } from "@/components/GuaranteedSpecialistBadge";
import { api, type ApiUser } from "@/lib/api";

const STATUS_LABELS: Record<string, string> = {
  pending: "Ожидает",
  active: "Активен",
  blocked: "Заблокирован",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [items, setItems] = useState<ApiUser[]>([]);
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    return Promise.all([api.adminUsers({ limit: "500" }), api.categories()]).then(([usersRes, cats]) => {
      setItems(usersRes.items);
      const map: Record<string, string> = {};
      for (const c of cats.items) map[c.id] = c.name;
      setCategoryNames(map);
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
        return load();
      })
      .catch(() => router.push("/login"));
  }, [router, load]);

  const labelServices = useMemo(
    () => (u: ApiUser) =>
      (u.serviceCategoryIds ?? [])
        .map((id) => categoryNames[id] ?? id)
        .join(", "),
    [categoryNames],
  );

  async function toggleGuaranteedSpecialist(target: ApiUser) {
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

  async function setStatus(target: ApiUser, status: "active" | "blocked") {
    if (
      status === "blocked" &&
      !confirm(`Заблокировать ${target.email}? Пользователь не сможет войти.`)
    ) {
      return;
    }
    setError("");
    setBusyId(target.id);
    try {
      const { user: updated } = (await api.setUserStatus(target.id, status)) as {
        user: ApiUser;
      };
      setItems((prev) => prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось изменить статус");
    } finally {
      setBusyId(null);
    }
  }

  function canBlockTarget(target: ApiUser): boolean {
    if (!user || target.id === user.id) return false;
    if (target.isSuperAdmin) return false;
    if (target.roles.includes("admin") && !user.isSuperAdmin) return false;
    return target.status !== "blocked";
  }

  function canUnblock(target: ApiUser): boolean {
    if (!user || target.id === user.id) return false;
    if (target.isSuperAdmin) return false;
    if (target.roles.includes("admin") && !user.isSuperAdmin) return false;
    return target.status === "blocked";
  }

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Пользователи</h1>
      <p className="mt-1 text-sm text-slate-600">
        Любой администратор может блокировать пользователей. Блокировка снимает все активные сессии.
        Значок{" "}
        <GuaranteedSpecialistBadge className="align-middle" /> (гарантированный специалист) — в разделе{" "}
        <Link href="/admin/guaranteed-specialists" className="text-primary hover:underline">
          ГС
        </Link>{" "}
        или кнопкой у одобренного исполнителя ниже.
      </p>
      {error && (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-2">ФИО</th>
            <th>Email</th>
            <th>Роли</th>
            <th>Профиль</th>
            <th>Статус</th>
            <th>ГС</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((u) => {
            const needsContractorApproval =
              u.roles.includes("contractor") &&
              !u.contractorApprovedAt &&
              u.emailVerifiedAt &&
              u.status !== "blocked";
            const profileBits: string[] = [];
            if (u.roles.includes("employee") && u.city) profileBits.push(`город: ${u.city}`);
            if (u.roles.includes("contractor")) {
              if (u.organizationName) profileBits.push(u.organizationName);
              const sv = labelServices(u);
              if (sv) profileBits.push(sv);
            }
            const busy = busyId === u.id;
            return (
              <tr key={u.id} className="border-b align-top">
                <td className="py-2">
                  <span className="inline-flex items-center gap-1.5">
                    {u.fullName}
                    {u.guaranteedSpecialist && <GuaranteedSpecialistBadge />}
                  </span>
                </td>
                <td>{u.email}</td>
                <td>{u.roles.join(", ")}</td>
                <td className="max-w-xs text-xs text-slate-600">
                  {profileBits.length ? profileBits.join(" · ") : "—"}
                </td>
                <td>
                  <span className={u.status === "blocked" ? "font-medium text-red-700" : ""}>
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                  {u.roles.includes("contractor") && !u.contractorApprovedAt && u.status !== "blocked" && (
                    <span className="ml-1 text-xs text-amber-700">исполнитель не одобрен</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {u.roles.includes("contractor") && u.contractorApprovedAt && u.status !== "blocked" ? (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-emerald-700 disabled:opacity-50"
                      onClick={() => toggleGuaranteedSpecialist(u)}
                    >
                      {u.guaranteedSpecialist ? "Снять" : "Присвоить"}
                    </button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="space-x-2 whitespace-nowrap">
                  {needsContractorApproval && (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-primary disabled:opacity-50"
                      onClick={() => setStatus(u, "active")}
                    >
                      Одобрить исполнителя
                    </button>
                  )}
                  {canBlockTarget(u) && (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-red-600 disabled:opacity-50"
                      onClick={() => setStatus(u, "blocked")}
                    >
                      Заблокировать
                    </button>
                  )}
                  {canUnblock(u) && (
                    <button
                      type="button"
                      disabled={busy}
                      className="text-green-700 disabled:opacity-50"
                      onClick={() => setStatus(u, "active")}
                    >
                      Разблокировать
                    </button>
                  )}
                  {u.status === "pending" && !u.emailVerifiedAt && (
                    <span className="text-xs text-slate-500">ждёт код</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AppShell>
  );
}
