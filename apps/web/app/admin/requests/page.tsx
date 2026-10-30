"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  RequestFilters,
  emptyRequestFilters,
  type RequestFilterValues,
} from "@/components/RequestFilters";
import { api, type ApiUser } from "@/lib/api";
import { buildRequestsSearchParams } from "@/lib/request-query";
import { displayRequestPrice } from "@/lib/format-price";

export default function AdminRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filters, setFilters] = useState<RequestFilterValues>({
    ...emptyRequestFilters,
    status: "new",
  });
  const [items, setItems] = useState<Record<string, unknown>[]>([]);

  const load = useCallback((f: RequestFilterValues) => {
    const qs = buildRequestsSearchParams(f);
    const query: Record<string, string> = {};
    new URLSearchParams(qs.replace(/^\?/, "")).forEach((v, k) => {
      query[k] = v;
    });
    return api.requests(query).then((r) => setItems(r.items));
  }, []);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        if (!u.roles.some((r) => ["dispatcher", "admin"].includes(r))) {
          router.push("/dashboard");
          return null;
        }
        setUser(u);
        return api.categories();
      })
      .then((c) => {
        if (!c) return;
        setCategories(c.items);
        return load({ ...emptyRequestFilters, status: "new" });
      })
      .catch(() => router.push("/login"));
  }, [router, load]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Заявки (панель)</h1>
      <RequestFilters
        values={filters}
        onChange={setFilters}
        categories={categories}
        onApply={(f) => load(f)}
      />
      <ul className="mt-6 divide-y rounded-lg border bg-white">
        {items.map((r) => (
          <li key={String(r.id)}>
            <Link href={`/requests/${r.id}`} className="flex flex-wrap gap-3 px-4 py-3 hover:bg-slate-50">
              <span>{String(r.number)}</span>
              <span>{String(r.title)}</span>
              {displayRequestPrice(r) && (
                <span className="text-sm text-slate-600">{displayRequestPrice(r)}</span>
              )}
              <span className="text-xs text-slate-500">{String(r.status)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
