"use client";

import { countStringFieldsExcept, FilterCollapsible } from "@/components/FilterCollapsible";

export type ContractorFilterValues = {
  q: string;
  city: string;
  categoryId: string;
};

export const emptyContractorFilters: ContractorFilterValues = {
  q: "",
  city: "",
  categoryId: "",
};

export function ContractorFilters({
  values,
  onChange,
  categories,
  onApply,
}: {
  values: ContractorFilterValues;
  onChange: (v: ContractorFilterValues) => void;
  categories: { id: string; name: string }[];
  onApply: (values: ContractorFilterValues) => void;
}) {
  const set = (key: keyof ContractorFilterValues, val: string) =>
    onChange({ ...values, [key]: val });

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm">
        Поиск
        <input
          className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 shadow-sm"
          placeholder="Название, описание услуг…"
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
            Город
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              placeholder="Любой"
              value={values.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Услуга
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
                onChange(emptyContractorFilters);
                onApply(emptyContractorFilters);
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
