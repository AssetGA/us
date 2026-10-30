"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNextPath } from "@/lib/auth-redirect";
import { useEffect, useState } from "react";
import { registerSchema, zodToFieldErrors } from "@service-desk/shared";
import { api, ApiValidationError } from "@/lib/api";
import { RegisterModeSwitch, type RegisterMode } from "./RegisterModeSwitch";

type RegisterFields = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  city: string;
  asCustomer: boolean;
  asContractor: boolean;
  organizationName: string;
  serviceCategoryIds: string[];
  servicesDescription: string;
  verifyChannel: "whatsapp" | "telegram" | "";
  worksWithoutDocuments: boolean;
};

const titles: Record<RegisterMode, { h1: string; lead: string }> = {
  customer: {
    h1: "Регистрация заказчика",
    lead: "Код подтверждения придёт в WhatsApp или Telegram на указанный телефон. Введите код на следующей странице — аккаунт станет активным.",
  },
  contractor: {
    h1: "Регистрация исполнителя",
    lead: "Подтверждение кодом на сервере, затем одобрение администратором для режима исполнителя.",
  },
};

function initialValues(mode: RegisterMode): RegisterFields {
  return {
    fullName: "",
    email: "",
    phone: "",
    password: "",
    city: "",
    asCustomer: mode === "customer",
    asContractor: mode === "contractor",
    organizationName: "",
    serviceCategoryIds: [],
    servicesDescription: "",
    verifyChannel: mode === "contractor" ? "" : "telegram",
    worksWithoutDocuments: false,
  };
}

export function RegisterForm({ mode }: { mode: RegisterMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAfterAuth = safeNextPath(searchParams.get("next"), "/dashboard");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [values, setValues] = useState<RegisterFields>(() => initialValues(mode));
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFields | "asCustomer" | "serviceCategoryIds", string>>
  >({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    setValues(initialValues(mode));
    setFieldErrors({});
    setFormError("");
  }, [mode]);

  useEffect(() => {
    if (mode === "customer") return;
    api.categories().then((c) => setCategories(c.items)).catch(() => {});
  }, [mode]);

  function toggleCategory(id: string) {
    setValues((v) => {
      const has = v.serviceCategoryIds.includes(id);
      return {
        ...v,
        serviceCategoryIds: has
          ? v.serviceCategoryIds.filter((x) => x !== id)
          : [...v.serviceCategoryIds, id],
      };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(
        zodToFieldErrors(parsed.error) as Partial<
          Record<keyof RegisterFields | "asCustomer" | "serviceCategoryIds", string>
        >,
      );
      return;
    }
    setFieldErrors({});
    try {
      const result = await api.register(parsed.data);
      const email = result.email ?? values.email;
      const params = new URLSearchParams({ email });
      if (result.verifyChannel) params.set("verify", String(result.verifyChannel));
      if (result.telegramBotUrl) params.set("bot", result.telegramBotUrl);
      if (nextAfterAuth !== "/dashboard") params.set("next", nextAfterAuth);
      router.push(`/verify-email?${params.toString()}`);
    } catch (err) {
      if (err instanceof ApiValidationError) {
        setFieldErrors(err.fields as Partial<Record<keyof RegisterFields, string>>);
        setFormError(err.message);
        return;
      }
      setFormError(err instanceof Error ? err.message : "Ошибка регистрации");
    }
  }

  const showCustomerFields = values.asCustomer;
  const showContractorFields = values.asContractor;
  const { h1, lead } = titles[mode];

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="w-full max-w-lg space-y-4 rounded-xl bg-white p-8 shadow-sm"
    >
      <RegisterModeSwitch current={mode} />
      <h1 className="text-2xl font-semibold">{h1}</h1>
      <p className="text-sm text-slate-600">{lead}</p>
      {formError && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      )}

      {fieldErrors.asCustomer && (
        <p className="text-sm text-red-600">{fieldErrors.asCustomer}</p>
      )}

      <label className="block text-sm">
        ФИО *
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={values.fullName}
          onChange={(e) => setValues({ ...values, fullName: e.target.value })}
        />
        {fieldErrors.fullName && <p className="text-sm text-red-600">{fieldErrors.fullName}</p>}
      </label>
      <label className="block text-sm">
        Email *
        <input
          type="email"
          className="mt-1 w-full rounded border px-3 py-2"
          value={values.email}
          onChange={(e) => setValues({ ...values, email: e.target.value })}
        />
        {fieldErrors.email && <p className="text-sm text-red-600">{fieldErrors.email}</p>}
      </label>
      <label className="block text-sm">
        Телефон{showCustomerFields ? " *" : ""}
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={values.phone}
          onChange={(e) => setValues({ ...values, phone: e.target.value })}
        />
        {fieldErrors.phone && <p className="text-sm text-red-600">{fieldErrors.phone}</p>}
      </label>

      {showCustomerFields && (
        <fieldset className="space-y-2 rounded border border-slate-200 p-3">
          <legend className="px-1 text-sm font-medium">Куда отправить код подтверждения *</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="verifyChannel"
              checked={values.verifyChannel === "whatsapp"}
              onChange={() => setValues({ ...values, verifyChannel: "whatsapp" })}
            />
            WhatsApp
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="verifyChannel"
              checked={values.verifyChannel === "telegram"}
              onChange={() => setValues({ ...values, verifyChannel: "telegram" })}
            />
            Telegram (бот пришлёт код в чат)
          </label>
          {fieldErrors.verifyChannel && (
            <p className="text-sm text-red-600">{fieldErrors.verifyChannel}</p>
          )}
        </fieldset>
      )}

      {showCustomerFields && (
        <label className="block text-sm">
          Город
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Например, Алматы"
            value={values.city}
            onChange={(e) => setValues({ ...values, city: e.target.value })}
          />
          {mode === "customer" && (
            <span className="mt-1 block text-xs text-slate-500">
              Адрес и детали заказа укажете при создании заявки.
            </span>
          )}
          {fieldErrors.city && <p className="text-sm text-red-600">{fieldErrors.city}</p>}
        </label>
      )}

      {showContractorFields && (
        <>
          <label className="block text-sm">
            Организация / ИП
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              disabled={values.worksWithoutDocuments}
              placeholder={values.worksWithoutDocuments ? "Не требуется" : "Название организации или ИП"}
              value={values.organizationName}
              onChange={(e) =>
                setValues({
                  ...values,
                  organizationName: e.target.value,
                  worksWithoutDocuments: e.target.value.trim() ? false : values.worksWithoutDocuments,
                })
              }
            />
            {fieldErrors.organizationName && (
              <p className="text-sm text-red-600">{fieldErrors.organizationName}</p>
            )}
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.worksWithoutDocuments}
              onChange={(e) =>
                setValues({
                  ...values,
                  worksWithoutDocuments: e.target.checked,
                  organizationName: e.target.checked ? "" : values.organizationName,
                })
              }
            />
            <span>
              Без документов — работа без оформления ИП / организации. В портфолио для заказчиков
              будет указано, что услуги оказываются без документов.
            </span>
          </label>


          <fieldset className="space-y-2 rounded border border-slate-200 p-3">
            <legend className="px-1 text-sm font-medium">Виды услуг *</legend>
            {categories.length === 0 && (
              <p className="text-sm text-slate-500">Загрузка списка…</p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.serviceCategoryIds.includes(c.id)}
                    onChange={() => toggleCategory(c.id)}
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
            Дополнительно о ваших услугах
            <textarea
              rows={2}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Опыт, район работы, лицензии — необязательно"
              value={values.servicesDescription}
              onChange={(e) =>
                setValues({ ...values, servicesDescription: e.target.value })
              }
            />
            {fieldErrors.servicesDescription && (
              <p className="text-sm text-red-600">{fieldErrors.servicesDescription}</p>
            )}
          </label>
        </>
      )}

      <label className="block text-sm">
        Пароль *
        <input
          type="password"
          className="mt-1 w-full rounded border px-3 py-2"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
        />
        {fieldErrors.password && <p className="text-sm text-red-600">{fieldErrors.password}</p>}
      </label>

      <button type="submit" className="w-full rounded bg-primary py-2 text-white">
        Зарегистрироваться
      </button>
      <p className="text-center text-sm text-slate-600">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary">
          Вход
        </Link>
      </p>
    </form>
  );
}

export function RegisterPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      {children}
    </div>
  );
}
