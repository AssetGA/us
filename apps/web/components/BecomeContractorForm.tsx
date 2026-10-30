"use client";

import { useEffect, useState } from "react";
import { becomeContractorSchema, zodToFieldErrors } from "@service-desk/shared";
import { api, ApiValidationError, type ApiUser } from "@/lib/api";

export function BecomeContractorForm({
  user,
  onDone,
}: {
  user: ApiUser;
  onDone: (u: ApiUser) => void;
}) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [worksWithoutDocuments, setWorksWithoutDocuments] = useState(false);
  const [serviceCategoryIds, setServiceCategoryIds] = useState<string[]>([]);
  const [servicesDescription, setServicesDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.categories().then((c) => setCategories(c.items));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    const parsed = becomeContractorSchema.safeParse({
      organizationName,
      worksWithoutDocuments,
      serviceCategoryIds,
      servicesDescription,
    });
    if (!parsed.success) {
      setFieldErrors(zodToFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const res = await api.becomeContractor(parsed.data);
      setMessage(res.message ?? "Сохранено");
      onDone(res.user);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields);
        setMessage(err.message);
      } else {
        setMessage(err instanceof Error ? err.message : "Ошибка");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-4 rounded-lg border border-primary-soft-border bg-primary-soft/50 p-4">
      <h2 className="text-lg font-medium">Стать исполнителем в этом аккаунте</h2>
      <p className="text-sm text-slate-600">
        Email, ФИО и телефон остаются как у заказчика ({user.email}). Дополните данные исполнителя и
        нажмите «Принять изменения» — заявка уйдёт администратору.
      </p>

      <label className="block text-sm">
        Организация / ИП
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          disabled={worksWithoutDocuments}
          value={organizationName}
          onChange={(e) => {
            setOrganizationName(e.target.value);
            if (e.target.value.trim()) setWorksWithoutDocuments(false);
          }}
        />
        {fieldErrors.organizationName && (
          <p className="text-sm text-red-600">{fieldErrors.organizationName}</p>
        )}
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
        Без документов (ИП / организация не указываются)
      </label>

      <fieldset className="space-y-2 rounded border border-slate-200 bg-white p-3">
        <legend className="px-1 text-sm font-medium">Виды услуг *</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={serviceCategoryIds.includes(c.id)}
                onChange={(e) => {
                  setServiceCategoryIds((prev) =>
                    e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                  );
                }}
              />
              {c.name}
            </label>
          ))}
        </div>
        {fieldErrors.serviceCategoryIds && (
          <p className="text-sm text-red-600">{fieldErrors.serviceCategoryIds}</p>
        )}
      </fieldset>

      <label className="block text-sm">
        Портфолио
        <textarea
          rows={2}
          className="mt-1 w-full rounded border px-3 py-2"
          value={servicesDescription}
          onChange={(e) => setServicesDescription(e.target.value)}
        />
      </label>

      <button
        type="submit"
        disabled={saving || serviceCategoryIds.length === 0}
        className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Отправка…" : "Принять изменения"}
      </button>
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </form>
  );
}
