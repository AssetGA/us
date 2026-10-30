"use client";

import { useEffect, useMemo, useState } from "react";
import { TelegramNotificationsLink } from "@/components/TelegramNotificationsLink";
import { api, type ApiUser } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import {
  WORKS_WITHOUT_DOCUMENTS_PORTFOLIO_LINE,
  buildContractorPortfolioText,
} from "@service-desk/shared";

function avatarSrc(user: ApiUser) {
  if (!user.avatarUrl) return null;
  if (user.avatarUrl.startsWith("http")) return user.avatarUrl;
  const base = getApiBaseUrl();
  return `${base}${user.avatarUrl.split("?")[0]}?v=${user.avatarUrl.includes("?") ? user.avatarUrl.split("?")[1]?.replace("v=", "") : Date.now()}`;
}

export function ContractorProfileEditor({
  user,
  onUpdated,
}: {
  user: ApiUser;
  onUpdated: (u: ApiUser) => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [organizationName, setOrganizationName] = useState(user.organizationName ?? "");
  const [worksWithoutDocuments, setWorksWithoutDocuments] = useState(
    Boolean(user.worksWithoutDocuments),
  );
  const [servicesDescription, setServicesDescription] = useState(user.servicesDescription ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(user.serviceCategoryIds ?? []);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState("");

  useEffect(() => {
    api.categories().then((c) => setCategories(c.items));
  }, []);

  useEffect(() => {
    setFullName(user.fullName);
    setPhone(user.phone ?? "");
    setCity(user.city ?? "");
    setOrganizationName(user.organizationName ?? "");
    setWorksWithoutDocuments(Boolean(user.worksWithoutDocuments));
    setServicesDescription(user.servicesDescription ?? "");
    setCategoryIds(user.serviceCategoryIds ?? []);
  }, [user]);

  const preview = useMemo(() => avatarSrc(user), [user]);
  const portfolioPreview = useMemo(
    () =>
      buildContractorPortfolioText({
        worksWithoutDocuments,
        servicesDescription,
      }),
    [worksWithoutDocuments, servicesDescription],
  );

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { user: u } = await api.updateContractorProfile({
        fullName,
        phone: phone || undefined,
        city: city || undefined,
        worksWithoutDocuments,
        organizationName: worksWithoutDocuments ? undefined : organizationName,
        servicesDescription: servicesDescription || undefined,
        serviceCategoryIds: categoryIds,
      });
      onUpdated(u);
      setMsg("Сохранено");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarMsg("");
    if (file.size > 650_000) {
      setAvatarMsg("Файл не больше 650 КБ");
      return;
    }
    const contentType = file.type as "image/jpeg" | "image/png" | "image/webp";
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      setAvatarMsg("Форматы: JPEG, PNG, WebP");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] ?? "";
      try {
        const { user: u } = await api.uploadAvatar({ contentType, imageBase64: base64 });
        onUpdated(u);
        setAvatarMsg("Фото обновлено");
      } catch (err) {
        setAvatarMsg(err instanceof Error ? err.message : "Ошибка загрузки");
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-6 max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-slate-100 text-slate-400">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl">👤</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            Фото профиля
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block text-sm"
              onChange={onPhotoChange}
            />
          </label>
          {avatarMsg && <p className="mt-1 text-sm text-slate-600">{avatarMsg}</p>}
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-3">
        <label className="block text-sm">
          ФИО
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Email
          <input value={user.email} readOnly className="mt-1 w-full rounded border bg-slate-50 px-3 py-2" />
        </label>
        <label className="block text-sm">
          Телефон
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Город
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Организация / ИП
          <input
            value={organizationName}
            disabled={worksWithoutDocuments}
            onChange={(e) => {
              setOrganizationName(e.target.value);
              if (e.target.value.trim()) setWorksWithoutDocuments(false);
            }}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={worksWithoutDocuments}
            onChange={(e) => {
              setWorksWithoutDocuments(e.target.checked);
              if (e.target.checked) setOrganizationName("");
            }}
          />
          <span>Без документов (отображается в портфолио для заказчиков)</span>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">Виды услуг</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {categories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(c.id)}
                  onChange={(e) => {
                    setCategoryIds((prev) =>
                      e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                    );
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm">
          Портфолио
          <textarea
            value={servicesDescription}
            onChange={(e) => setServicesDescription(e.target.value)}
            rows={3}
            placeholder="Опыт, примеры работ, район — дополнительно к строке «без документов», если отмечено"
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        {portfolioPreview && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Как видят заказчики</p>
            <p className="mt-1 whitespace-pre-wrap">{portfolioPreview}</p>
          </div>
        )}
        {worksWithoutDocuments && !servicesDescription.trim() && (
          <p className="text-xs text-slate-500">{WORKS_WITHOUT_DOCUMENTS_PORTFOLIO_LINE}</p>
        )}
        {user.ratingAsContractor && user.ratingAsContractor.count > 0 && (
          <p className="text-sm text-amber-700">
            Рейтинг работ: ★ {user.ratingAsContractor.avg.toFixed(1)} ({user.ratingAsContractor.count})
          </p>
        )}
        {!user.contractorApprovedAt && (
          <p className="text-sm text-amber-800">Ожидает одобрения администратором.</p>
        )}
        <button
          type="submit"
          disabled={
            saving ||
            categoryIds.length === 0 ||
            (!worksWithoutDocuments && organizationName.trim().length < 2)
          }
          className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Сохранение…" : "Сохранить профиль"}
        </button>
        {msg && <p className="text-sm text-slate-600">{msg}</p>}
      </form>
      <TelegramNotificationsLink user={user} />
    </div>
  );
}
