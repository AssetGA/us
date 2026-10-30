"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RequestFilters,
  emptyRequestFilters,
  type RequestFilterValues,
} from "@/components/RequestFilters";
import { displayRequestPrice } from "@/lib/format-price";
import { publicCategories, publicRequests, type PublicRequestItem } from "@/lib/public-api";
import { filtersToQuery } from "@/lib/request-query";

const STATUS_LABELS: Record<string, string> = {
  new: "Новая",
  under_review: "На проверке",
  assigned: "Назначена",
  in_progress: "В работе",
  waiting: "Ожидание",
  completed: "Выполнена",
  closed: "Закрыта",
  rejected: "Отклонена",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ru-RU");
  } catch {
    return iso;
  }
}

export function PublicRequestsSection({ className = "" }: { className?: string }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<RequestFilterValues>(emptyRequestFilters);
  const [items, setItems] = useState<PublicRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((f: RequestFilterValues) => {
    setLoading(true);
    setError(null);
    const q = filtersToQuery(f);
    return publicRequests(q)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => setError("Не удалось загрузить список заказов"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    publicCategories()
      .then((c) => setCategories(c.items))
      .catch(() => {});
    load(emptyRequestFilters);
  }, [load]);

  return (
    <section className={className}>
      <h2 className="text-xl font-semibold">Список заказов</h2>
      <RequestFilters
        values={filters}
        onChange={setFilters}
        categories={categories}
        onApply={(f) => load(f)}
      />
      <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
        <span>Найдено: {total}</span>
        {loading && <span>Загрузка…</span>}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {!loading && items.length === 0 && (
          <li className="px-4 py-8 text-center text-slate-500">Заказов не найдено</li>
        )}
        {items.map((r) => {
          const price = displayRequestPrice(r as unknown as Record<string, unknown>);
          return (
            <li key={r.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{r.number}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
              <div className="mt-1 font-medium">{r.title}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
                {r.categoryName && <span>{r.categoryName}</span>}
                {r.site && <span>{r.site}</span>}
                {price && <span>{price}</span>}
                {"validUntil" in r && r.validUntil && (
                  <span>до {formatDate(String(r.validUntil))}</span>
                )}
                <span>{formatDate(r.createdAt)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
