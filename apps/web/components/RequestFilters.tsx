"use client";

import { REQUEST_PRIORITIES, REQUEST_STATUSES } from "@service-desk/shared";
import { countStringFieldsExcept, FilterCollapsible } from "@/components/FilterCollapsible";

export type RequestFilterValues = {
  status: string;
  priority: string;
  categoryId: string;
  createdFrom: string;
  createdTo: string;
  minPrice: string;
  maxPrice: string;
  q: string;
};

export const emptyRequestFilters: RequestFilterValues = {
  status: "",
  priority: "",
  categoryId: "",
  createdFrom: "",
  createdTo: "",
  minPrice: "",
  maxPrice: "",
  q: "",
};

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

const PRIORITY_LABELS: Record<string, string> = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  urgent: "Срочный",
};

export function RequestFilters({
  values,
  onChange,
  categories,
  onApply,
}: {
  values: RequestFilterValues;
  onChange: (v: RequestFilterValues) => void;
  categories: { id: string; name: string }[];
  onApply: (values: RequestFilterValues) => void;
}) {
  const set = (key: keyof RequestFilterValues, val: string) =>
    onChange({ ...values, [key]: val });

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm">
        Поиск
        <input
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm"
          placeholder="Номер, заголовок…"
          value={values.q}
          onChange={(e) => set("q", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onApply(values);
          }}
        />
      </label>
      <FilterCollapsible
        className=""
        activeCount={countStringFieldsExcept(values, ["q"])}
      >
        <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            Статус
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="">Все</option>
              {REQUEST_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Приоритет
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.priority}
              onChange={(e) => set("priority", e.target.value)}
            >
              <option value="">Все</option>
              {REQUEST_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p] ?? p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Категория
            <select
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
            >
              <option value="">Все</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Дата с
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.createdFrom}
              onChange={(e) => set("createdFrom", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Дата по
            <input
              type="date"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.createdTo}
              onChange={(e) => set("createdTo", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Цена от
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.minPrice}
              onChange={(e) => set("minPrice", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Цена до
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              value={values.maxPrice}
              onChange={(e) => set("maxPrice", e.target.value)}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button
              type="button"
              onClick={() => onApply(values)}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white shadow-sm transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow active:shadow-none"
            >
              Применить
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(emptyRequestFilters);
                onApply(emptyRequestFilters);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm transition-all duration-200 ease-out hover:border-slate-400 hover:bg-slate-50"
            >
              Сбросить
            </button>
          </div>
        </div>
      </FilterCollapsible>
    </div>
  );
}
