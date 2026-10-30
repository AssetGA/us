"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RequestFilters,
  emptyRequestFilters,
  type RequestFilterValues,
} from "@/components/RequestFilters";
import { api } from "@/lib/api";
import { buildRequestsSearchParams } from "@/lib/request-query";
import { displayRequestPrice } from "@/lib/format-price";
import { ListWhyDisclosure } from "@/components/ListWhyDisclosure";

export function CustomerRequestsList({
  title = "Мои заявки",
  className = "",
}: {
  title?: string;
  className?: string;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<RequestFilterValues>(emptyRequestFilters);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback((f: RequestFilterValues) => {
    setLoading(true);
    const params = buildRequestsSearchParams(f).replace(/^\?/, "");
    const query: Record<string, string> = {};
    if (params) {
      new URLSearchParams(params).forEach((v, k) => {
        query[k] = v;
      });
    }
    return api
      .requests(query)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.categories().then((c) => setCategories(c.items));
    load(emptyRequestFilters);
  }, [load]);

  return (
    <section className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Link href="/requests/new" className="text-sm text-primary hover:underline">
          + Новая заявка
        </Link>
      </div>
      <ListWhyDisclosure className="mt-3">
        Здесь только <strong>ваши</strong> заявки как заказчика. В списке учитываются выбранные в
        фильтрах статус, категория, даты, цена и поиск по номеру или названию. Пустой результат
        значит, что по текущим условиям заявок нет — попробуйте сбросить фильтры или создайте новую
        заявку.
      </ListWhyDisclosure>
      <RequestFilters
        values={filters}
        onChange={setFilters}
        categories={categories}
        onApply={(f) => load(f)}
      />
      <p className="mt-2 text-sm text-slate-500">
        Найдено: {total}
        {loading && " · загрузка…"}
      </p>
      <ul className="mt-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {!loading && items.length === 0 && (
          <li className="px-4 py-8 text-center text-slate-500">Заявок не найдено</li>
        )}
        {items.map((r) => {
          const price = displayRequestPrice(r);
          return (
            <li key={String(r.id)}>
              <Link
                href={`/requests/${r.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium">{String(r.number)}</span>
                <span className="min-w-0 flex-1 truncate">{String(r.title)}</span>
                {price && <span className="text-sm text-slate-700">{price}</span>}
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{String(r.status)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
