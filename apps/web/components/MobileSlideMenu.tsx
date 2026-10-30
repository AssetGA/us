"use client";

import Link from "next/link";
import { useEffect } from "react";

export type MobileNavLink = {
  href: string;
  label: string;
  active?: boolean;
};

export function MobileMenuToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm transition-all duration-200 ease-out hover:border-slate-300 hover:bg-slate-50 hover:shadow md:hidden"
      aria-expanded={open}
      aria-controls="mobile-slide-menu"
      aria-label={open ? "Закрыть меню" : "Открыть меню"}
      onClick={onToggle}
    >
      <span
        className={`absolute block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "translate-y-0 rotate-45" : "-translate-y-1.5"
        }`}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "scale-x-0 opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute block h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
          open ? "translate-y-0 -rotate-45" : "translate-y-1.5"
        }`}
      />
    </button>
  );
}

export function MobileSlideMenuPanel({
  open,
  onClose,
  brandHref,
  brandLabel,
  links,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  brandHref: string;
  brandLabel: string;
  links: MobileNavLink[];
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        id="mobile-slide-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Навигация"
        className={`absolute right-0 top-0 flex h-full w-[min(100%,20.5rem)] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <Link
            href={brandHref}
            className="text-lg font-semibold text-slate-900"
            onClick={onClose}
          >
            {brandLabel}
          </Link>
          <MobileMenuToggle open={open} onToggle={onClose} />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map((l, i) => (
              <li
                key={l.href + l.label}
                className="transition-all duration-300 ease-out"
                style={{
                  transitionDelay: open ? `${Math.min(i * 40, 200)}ms` : "0ms",
                  opacity: open ? 1 : 0,
                  transform: open ? "translateX(0)" : "translateX(0.75rem)",
                }}
              >
                <Link
                  href={l.href}
                  onClick={onClose}
                  className={`block rounded-xl px-4 py-3.5 text-base font-medium transition-all duration-200 ease-out ${
                    l.active
                      ? "bg-primary-soft text-primary-strong"
                      : "text-slate-700 hover:bg-slate-100 active:bg-slate-200"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {footer && (
          <div className="border-t border-slate-100 px-4 py-4">{footer}</div>
        )}
      </aside>
    </div>
  );
}
