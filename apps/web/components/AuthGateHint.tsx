"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginUrl, registerUrl } from "@/lib/auth-redirect";

/** Поле только для просмотра; при попытке ввода — регистрация/вход */
export function useRequireAuthOnInteract(nextAfterAuth = "/dashboard") {
  const router = useRouter();

  function onInteract(e: React.SyntheticEvent) {
    e.preventDefault();
    router.push(registerUrl(nextAfterAuth));
  }

  return { onInteract, nextAfterAuth };
}

export function AuthGateBanner({ nextAfterAuth = "/dashboard" }: { nextAfterAuth?: string }) {
  return (
    <p className="rounded-lg border border-primary-soft-border bg-primary-soft px-3 py-2 text-sm text-slate-900">
      Поля доступны для просмотра без регистрации. Чтобы заполнить и отправить заявку,{" "}
      <Link href={registerUrl(nextAfterAuth)} className="font-medium underline">
        зарегистрируйтесь
      </Link>{" "}
      или{" "}
      <Link href={loginUrl(nextAfterAuth)} className="font-medium underline">
        войдите
      </Link>
      .
    </p>
  );
}

export function gatedFieldProps(onInteract: (e: React.SyntheticEvent) => void) {
  return {
    readOnly: true,
    onFocus: onInteract,
    onMouseDown: (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "SELECT") onInteract(e);
    },
    onClick: (e: React.MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "SELECT" || t.tagName === "BUTTON") onInteract(e);
    },
    className: "cursor-pointer bg-slate-50",
    "aria-readonly": true as const,
  };
}
