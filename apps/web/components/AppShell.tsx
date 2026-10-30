"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type ApiUser } from "@/lib/api";
import { useParticipationMode } from "@/hooks/useParticipationMode";
import { hasContractorRole, hasCustomerRole } from "@/lib/participation";
import {
  MobileMenuToggle,
  MobileSlideMenuPanel,
  type MobileNavLink,
} from "@/components/MobileSlideMenu";
import { TelegramLinkBanner } from "@/components/TelegramLinkBanner";

const navForRoles = (user: ApiUser, participation: "customer" | "contractor") => {
  const isCustomer = hasCustomerRole(user);
  const isContractorRole = hasContractorRole(user);
  const contractorUi = isContractorRole && participation === "contractor";

  if (contractorUi) {
    return [
      { href: "/dashboard", label: "Главная" },
      { href: "/profile", label: "Профиль" },
    ];
  }

  const links: { href: string; label: string }[] = [];
  if (isCustomer && participation === "customer") {
    links.push(
      { href: "/dashboard", label: "Главная" },
      { href: "/contractors", label: "Список исполнителей" },
      { href: "/requests/new", label: "Новая заявка" },
    );
  }
  if (links.length === 0) {
    links.push({ href: "/dashboard", label: "Главная" });
  }
  links.push({ href: "/profile", label: "Профиль" });

  if (user.roles.some((r) => ["dispatcher", "admin"].includes(r))) {
    links.push({ href: "/admin/requests", label: "Панель" });
  }
  if (user.roles.includes("admin")) {
    links.push(
      { href: "/admin/users", label: "Пользователи" },
      { href: "/admin/guaranteed-specialists", label: "ГС" },
      { href: "/admin/reports", label: "Отчёты" },
    );
  }
  if (user.isSuperAdmin) {
    links.push({ href: "/admin/admins", label: "Администраторы" });
  }
  return links;
};

function linkActive(pathname: string, href: string) {
  return (
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
  );
}

export function AppShell({
  user,
  children,
}: {
  user: ApiUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const participation = useParticipationMode(user);
  const links = navForRoles(user, participation);
  const [menuOpen, setMenuOpen] = useState(false);
  const contractorPending =
    hasContractorRole(user) &&
    participation === "contractor" &&
    !user.contractorApprovedAt;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const mobileLinks: MobileNavLink[] = links.map((l) => ({
    ...l,
    active: linkActive(pathname, l.href),
  }));

  async function logout() {
    await api.logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-surface-page text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold text-slate-800">
            Service Desk
          </Link>
          <nav className="hidden flex-wrap items-center gap-4 text-base md:flex">
            {links.map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                className={
                  linkActive(pathname, l.href)
                    ? "nav-link-active"
                    : "text-slate-600 hover:text-slate-900"
                }
              >
                {l.label}
              </Link>
            ))}
            <button
              type="button"
              className="text-slate-500 hover:text-slate-800"
              onClick={() => logout()}
            >
              Выйти
            </button>
          </nav>
          <MobileMenuToggle open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
        </div>
      </header>
      <MobileSlideMenuPanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brandHref="/dashboard"
        brandLabel="Service Desk"
        links={mobileLinks}
        footer={
          <button
            type="button"
            className="w-full rounded-xl border border-slate-200 py-3.5 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => {
              setMenuOpen(false);
              void logout();
            }}
          >
            Выйти
          </button>
        }
      />
      <TelegramLinkBanner user={user} />
      {contractorPending && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900 md:text-base">
          Заполните профиль — после одобрения администратором откроется доступ к заказам.
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
