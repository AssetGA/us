"use client";

import { useState } from "react";

export function FilterCollapsible({
  activeCount = 0,
  children,
  className = "mt-4",
}: {
  activeCount?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 shadow-sm transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:shadow sm:inline-flex sm:w-auto sm:min-w-[11rem]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-slate-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
          </svg>
          Фильтры
          {activeCount > 0 && (
            <span className="rounded-full bg-primary-muted px-2 py-0.5 text-sm font-medium text-slate-800">
              {activeCount}
            </span>
          )}
        </span>
        <span
          className={`text-slate-400 transition-transform duration-300 ease-out ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function countStringFields(values: Record<string, string>): number {
  return Object.values(values).filter((s) => String(s).trim() !== "").length;
}

export function countStringFieldsExcept(
  values: Record<string, string>,
  exceptKeys: string[],
): number {
  const skip = new Set(exceptKeys);
  return Object.entries(values).filter(
    ([k, v]) => !skip.has(k) && String(v).trim() !== "",
  ).length;
}
