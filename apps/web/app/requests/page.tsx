"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { CustomerRequestsList } from "@/components/CustomerRequestsList";
import { api, type ApiUser } from "@/lib/api";

/** Сохранён для закладок — тот же список, что на главной */
export default function RequestsPage() {
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
      <CustomerRequestsList title="Заявки" />
    </AppShell>
  );
}
