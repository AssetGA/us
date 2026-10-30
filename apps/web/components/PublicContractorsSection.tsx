"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ContractorFilters,
  emptyContractorFilters,
  type ContractorFilterValues,
} from "@/components/ContractorFilters";
import { contractorFiltersToQuery } from "@/lib/contractor-query";
import { ListWhyDisclosure } from "@/components/ListWhyDisclosure";
import { GuaranteedSpecialistBadge } from "@/components/GuaranteedSpecialistBadge";
import { publicCategories, publicContractors, type PublicContractorItem } from "@/lib/public-api";

export function PublicContractorsSection({ className = "" }: { className?: string }) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<ContractorFilterValues>(emptyContractorFilters);
  const [items, setItems] = useState<PublicContractorItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((f: ContractorFilterValues) => {
    setLoading(true);
    setError(null);
    return publicContractors(contractorFiltersToQuery(f))
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => setError("Не удалось загрузить исполнителей"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    publicCategories()
      .then((c) => setCategories(c.items))
      .catch(() => {});
    load(emptyContractorFilters);
  }, [load]);

  return (
    <section className={className}>
      <h2 className="text-xl font-semibold">Список исполнителей</h2>
      <p className="mt-1 text-sm text-slate-600">
        Одобренные исполнители — просмотр без регистрации.
      </p>
      <ListWhyDisclosure className="mt-3">
        Показаны <strong>одобренные администратором</strong> исполнители. Список сужается фильтрами:
        город, вид услуги и поиск по названию или описанию. Контакты и личные данные скрыты — полная
        работа с исполнителем через заявку и отклики. Значок <strong>ГС</strong> — гарантированный
        специалист; его присваивает администратор.
      </ListWhyDisclosure>
      <ContractorFilters
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
          <li className="px-4 py-8 text-center text-slate-500">Исполнителей не найдено</li>
        )}
        {items.map((c) => (
          <li key={c.id} className="px-4 py-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 font-medium text-slate-800">
              <span>{c.displayName}</span>
              {c.guaranteedSpecialist && <GuaranteedSpecialistBadge />}
            </div>
            {c.ratingAsContractor && c.ratingAsContractor.count > 0 && (
              <div className="text-amber-600">
                ★ {c.ratingAsContractor.avg.toFixed(1)} ({c.ratingAsContractor.count} оценок)
              </div>
            )}
            {c.city && <div className="text-slate-600">Город: {c.city}</div>}
            {c.serviceNames.length > 0 && (
              <div className="text-slate-600">Услуги: {c.serviceNames.join(", ")}</div>
            )}
            {c.worksWithoutDocuments && (
              <span className="mt-1 inline-block rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-900">
                Без документов
              </span>
            )}
            {(c.portfolio ?? c.servicesDescription) && (
              <div className="mt-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Портфолио
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-slate-500">
                  {c.portfolio ?? c.servicesDescription}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
