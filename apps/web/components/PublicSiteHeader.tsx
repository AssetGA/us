"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  MobileMenuToggle,
  MobileSlideMenuPanel,
  type MobileNavLink,
} from "@/components/MobileSlideMenu";

const PUBLIC_NAV = [
  { href: "/order", label: "Заказ услуги" },
  { href: "/browse/contractors", label: "Исполнители" },
  { href: "/login", label: "Вход" },
];

const PUBLIC_DESKTOP = [
  ...PUBLIC_NAV,
  { href: "/register", label: "Регистрация" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicSiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const mobileLinks: MobileNavLink[] = PUBLIC_NAV.map((l) => ({
    ...l,
    active: isActive(pathname, l.href),
  }));

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-slate-800">
            Service Desk
          </Link>
          <nav className="hidden items-center gap-5 text-base md:flex">
            {PUBLIC_DESKTOP.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={
                  l.href === "/register"
                    ? "rounded-lg bg-primary px-3 py-2 text-white hover:bg-primary-hover"
                    : isActive(pathname, l.href)
                      ? "nav-link-active"
                      : "text-slate-600 hover:text-slate-900"
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <MobileMenuToggle open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} />
        </div>
      </header>
      <MobileSlideMenuPanel
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        brandHref="/"
        brandLabel="Service Desk"
        links={mobileLinks}
        footer={
          <Link
            href="/register"
            onClick={() => setMenuOpen(false)}
            className="block w-full rounded-xl bg-primary py-3.5 text-center text-base font-medium text-white hover:bg-primary-hover"
          >
            Регистрация
          </Link>
        }
      />
    </>
  );
}
