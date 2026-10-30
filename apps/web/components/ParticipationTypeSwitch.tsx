"use client";

import Link from "next/link";
import type { ParticipationMode } from "@/lib/participation";

type Props = {
  active: ParticipationMode;
  hasCustomer: boolean;
  hasContractor: boolean;
  variant: "register" | "profile";
  onSelect?: (mode: ParticipationMode) => void;
  disabled?: boolean;
};

const items: { id: ParticipationMode; label: string; registerHref: string }[] = [
  { id: "customer", label: "Заказчик", registerHref: "/register" },
  { id: "contractor", label: "Исполнитель", registerHref: "/register/contractor" },
];

function itemClass(isActive: boolean, disabled?: boolean) {
  const base = isActive
    ? "flex-1 rounded-md bg-white px-3 py-2 text-center text-sm font-medium text-primary-strong shadow-sm"
    : "flex-1 rounded-md px-3 py-2 text-center text-sm text-slate-600 hover:bg-white/80";
  return disabled ? `${base} opacity-50` : base;
}

export function ParticipationTypeSwitch({
  active,
  hasCustomer,
  hasContractor,
  variant,
  onSelect,
  disabled,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {items.map((m) => {
          const isActive = active === m.id;

          if (variant === "register") {
            return (
              <Link key={m.id} href={m.registerHref} className={itemClass(isActive)}>
                {m.label}
              </Link>
            );
          }

          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              className={itemClass(isActive, disabled)}
              onClick={() => onSelect?.(m.id)}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">
        {variant === "profile"
          ? "Один аккаунт: заказчик может стать исполнителем (доп. данные и одобрение). Переключение на заказчика использует те же ФИО, email и телефон."
          : "При регистрации выберите основную роль; вторую можно подключить позже в профиле."}
      </p>
      {variant === "profile" && !hasCustomer && hasContractor && (
        <p className="text-xs text-amber-800">Нажмите «Заказчик», чтобы работать с заявками без смены данных профиля.</p>
      )}
      {variant === "profile" && hasCustomer && !hasContractor && (
        <p className="text-xs text-amber-800">Нажмите «Исполнитель», заполните форму и примите изменения.</p>
      )}
    </div>
  );
}
