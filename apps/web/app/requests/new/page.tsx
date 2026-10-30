"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestVoiceFillPanel } from "@/components/RequestVoiceFillPanel";
import { api, type ApiUser } from "@/lib/api";

export default function NewRequestPage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        if (!u.roles.includes("employee")) {
          router.replace("/dashboard");
          throw new Error("redirect");
        }
        setUser(u);
        return api.categories();
      })
      .then((c) => setCategories(c.items))
      .catch(() => router.push("/login"));
  }, [router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      const proposedRaw = String(fd.get("proposedPrice") ?? "").trim();
      const validUntilLocal = String(fd.get("validUntil") ?? "");
      const validUntil = new Date(validUntilLocal).toISOString();
      const res = await api.createRequest({
        title: fd.get("title"),
        description: fd.get("description"),
        categoryId: fd.get("categoryId"),
        priority: fd.get("priority") || "normal",
        validUntil,
        location: {
          site: fd.get("site"),
          address: fd.get("address") || undefined,
          floor: fd.get("floor") || undefined,
          room: fd.get("room") || undefined,
        },
        currency: fd.get("currency") || "KZT",
        ...(proposedRaw ? { proposedPrice: Number(proposedRaw) } : {}),
      });
      const id = (res as { request: { id: string } }).request.id;
      router.push(`/requests/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать заявку");
    }
  }

  if (!user) return null;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Новая заявка</h1>
      <div className="mt-4 max-w-xl">
        <RequestVoiceFillPanel formRef={formRef} categories={categories} />
      </div>
      <form ref={formRef} onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          Категория
          <select name="categoryId" required className="mt-1 w-full rounded border px-3 py-2">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Заголовок
          <input name="title" required minLength={3} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Описание
          <textarea name="description" required minLength={10} rows={4} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block text-sm">
          Филиал / объект
          <input name="site" required className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            Адрес
            <input name="address" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Этаж
            <input name="floor" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="block text-sm">
            Кабинет
            <input name="room" className="mt-1 w-full rounded border px-3 py-2" />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Ориентировочная цена услуги
            <input
              name="proposedPrice"
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Необязательно"
            />
          </label>
          <label className="block text-sm">
            Валюта
            <select name="currency" className="mt-1 w-full rounded border px-3 py-2" defaultValue="KZT">
              <option value="KZT">KZT</option>
              <option value="RUB">RUB</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Приоритет
          <select name="priority" className="mt-1 w-full rounded border px-3 py-2">
            <option value="low">Низкий</option>
            <option value="normal">Обычный</option>
            <option value="high">Высокий</option>
            <option value="urgent">Срочный</option>
          </select>
        </label>
        <label className="block text-sm">
          Срок действия заявки (до этого момента принимаются отклики)
          <input
            name="validUntil"
            type="datetime-local"
            required
            defaultValue={(() => {
              const d = new Date(Date.now() + 7 * 86400_000);
              const pad = (n: number) => String(n).padStart(2, "0");
              return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            })()}
            className="mt-1 w-full max-w-xs rounded border px-3 py-2"
          />
        </label>
        <button type="submit" className="rounded bg-primary px-4 py-2 text-white">
          Отправить
        </button>
      </form>
    </AppShell>
  );
}
