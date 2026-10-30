"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { ContractorOrdersHome } from "@/components/ContractorOrdersHome";
import { CustomerRequestsList } from "@/components/CustomerRequestsList";
import { api, type ApiUser } from "@/lib/api";
import { useParticipationMode } from "@/hooks/useParticipationMode";
import { hasContractorRole, hasCustomerRole } from "@/lib/participation";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [notifications, setNotifications] = useState<
    { id: string; title: string; body: string }[]
  >([]);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        setUser(u);
        return api.notifications();
      })
      .then((n) => setNotifications(n.items.slice(0, 5)))
      .catch(() => router.push("/login"));
  }, [router]);

  const participation = useParticipationMode(user);

  if (!user) return null;

  const isCustomer = hasCustomerRole(user);
  const isContractorRole = hasContractorRole(user);
  const isContractorApproved = Boolean(user.contractorApprovedAt);
  const contractorUi = isContractorRole && participation === "contractor";

  if (contractorUi) {
    return (
      <AppShell user={user}>
        {isContractorApproved ? (
          <ContractorOrdersHome />
        ) : (
          <div>
            <h1 className="text-2xl font-semibold">Главная</h1>
            <p className="mt-2 text-slate-600">
              Заполните профиль и дождитесь одобрения администратора — после этого здесь появятся
              заказы с фильтрами.
            </p>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      {isCustomer && participation === "customer" && (
        <>
          <h1 className="text-2xl font-semibold">Здравствуйте, {user.fullName}</h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/requests/new"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
            >
              Создать заявку
            </Link>
            <Link
              href="/contractors"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Список исполнителей
            </Link>
          </div>
          <CustomerRequestsList className="mt-10" title="Мои заявки" />
        </>
      )}

      {!isCustomer && (
        <>
          <h1 className="text-2xl font-semibold">Здравствуйте, {user.fullName}</h1>
          <p className="mt-1 text-slate-600">Роли: {user.roles.join(", ")}</p>
        </>
      )}

      {notifications.length > 0 && (
        <section className="mt-8">
          <h2 className="font-medium">Уведомления</h2>
          <ul className="mt-2 space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm">
                <strong>{n.title}</strong> — {n.body}
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
