"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PublicContractorsSection } from "@/components/PublicContractorsSection";
import { api, type ApiUser } from "@/lib/api";

export default function CustomerContractorsPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        if (!u.roles.includes("employee")) {
          router.replace("/dashboard");
          return;
        }
        setUser(u);
      })
      .catch(() => router.push("/login"));
  }, [router]);

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Список исполнителей</h1>
      <p className="mt-1 text-sm text-slate-600">
        Одобренные исполнители — фильтр по городу, услуге и поиску.
      </p>
      <PublicContractorsSection className="mt-6" />
    </AppShell>
  );
}
