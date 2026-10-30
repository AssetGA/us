"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  RequestFilters,
  emptyRequestFilters,
  type RequestFilterValues,
} from "@/components/RequestFilters";
import { api } from "@/lib/api";
import { displayRequestPrice } from "@/lib/format-price";
import { ListWhyDisclosure } from "@/components/ListWhyDisclosure";
import { filtersToQuery } from "@/lib/request-query";

function formatUntil(iso: unknown) {
  if (!iso || typeof iso !== "string") return null;
  return new Date(iso).toLocaleString("ru-RU");
}

export function ContractorOrdersHome() {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<RequestFilterValues>(emptyRequestFilters);
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback((f: RequestFilterValues) => {
    setLoading(true);
    const q = filtersToQuery(f);
    return api
      .contractorHomeRequests(q)
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
    <div>
      <h1 className="text-2xl font-semibold">Заказы</h1>
      <p className="mt-1 text-sm text-slate-600">
        Доступные заявки и ваши назначения — откройте карточку, чтобы откликнуться или выполнить
        работу.
      </p>
      <ListWhyDisclosure className="mt-3">
        В списке — <strong>открытые заявки</strong> по вашим категориям услуг (можно откликнуться)
        и <strong>уже назначенные вам</strong> заказы. Фильтры применяются к обоим типам. Заявки
        вне ваших услуг или с истёкшим сроком приёма откликов здесь не отображаются.
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
      <ul className="mt-4 divide-y rounded-lg border bg-white">
        {items.length === 0 && !loading && (
          <li className="px-4 py-8 text-center text-sm text-slate-500">Заказов не найдено</li>
        )}
        {items.map((r) => (
          <li key={String(r.id)}>
            <Link
              href={`/requests/${r.id}`}
              className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            >
              <span>
                {String(r.number)} — {String(r.title)}
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {String(r.status)}
                </span>
              </span>
              <span className="text-sm text-slate-600">
                {formatUntil(r.validUntil) && `активна до ${formatUntil(r.validUntil)}`}
                {displayRequestPrice(r) && ` · ${displayRequestPrice(r)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
