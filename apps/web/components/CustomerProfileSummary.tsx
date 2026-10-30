"use client";

import type { ApiUser } from "@/lib/api";

/** Общие поля аккаунта — те же, что у исполнителя, без отдельного дублирования */
export function CustomerProfileSummary({ user }: { user: ApiUser }) {
  return (
    <dl className="mt-6 space-y-2 text-sm">
      <div>
        <dt className="text-slate-500">ФИО</dt>
        <dd>{user.fullName}</dd>
      </div>
      <div>
        <dt className="text-slate-500">Email</dt>
        <dd>{user.email}</dd>
      </div>
      {user.phone && (
        <div>
          <dt className="text-slate-500">Телефон</dt>
          <dd>{user.phone}</dd>
        </div>
      )}
      <div>
        <dt className="text-slate-500">Город</dt>
        <dd>{user.city ?? "—"}</dd>
      </div>
      {user.ratingAsCustomer && user.ratingAsCustomer.count > 0 && (
        <div>
          <dt className="text-slate-500">Лояльность (отношение к исполнителям)</dt>
          <dd>
            ★ {user.ratingAsCustomer.avg.toFixed(1)} / 5 — {user.ratingAsCustomer.count} оценок
          </dd>
        </div>
      )}
      <p className="pt-2 text-xs text-slate-500">
        При переключении с исполнителя данные заказчика берутся из этого же аккаунта, менять их
        отдельно не нужно.
      </p>
    </dl>
  );
}
