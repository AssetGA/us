"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, type ApiUser } from "@/lib/api";

export default function AdminReportsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [report, setReport] = useState<{ total: number; byStatus: Record<string, number> } | null>(
    null,
  );

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        setUser(u);
        return api.reports();
      })
      .then(setReport)
      .catch(() => router.push("/login"));
  }, [router]);

  if (!user || !report) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Отчёт по заявкам</h1>
      <p className="mt-2">Всего: {report.total}</p>
      <ul className="mt-4 space-y-1 text-sm">
        {Object.entries(report.byStatus).map(([status, count]) => (
          <li key={status}>
            {status}: {count}
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
