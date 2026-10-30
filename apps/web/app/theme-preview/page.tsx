import Link from "next/link";
import { GuaranteedSpecialistBadge } from "@/components/GuaranteedSpecialistBadge";
import { PublicShell } from "@/components/PublicShell";

/** Превью палитры — /theme-preview (можно удалить после утверждения дизайна) */
export default function ThemePreviewPage() {
  const swatches = [
    { name: "Primary", token: "primary", hex: "#2563EB", className: "bg-primary" },
    { name: "Hover", token: "primary-hover", hex: "#1D4ED8", className: "bg-primary-hover" },
    { name: "Soft", token: "primary-soft", hex: "#EFF6FF", className: "bg-primary-soft border border-primary-soft-border" },
    { name: "Muted", token: "primary-muted", hex: "#DBEAFE", className: "bg-primary-muted" },
    { name: "Border", token: "primary-soft-border", hex: "#BFDBFE", className: "bg-primary-soft-border" },
    { name: "Ring", token: "primary-ring", hex: "#93C5FD", className: "bg-primary-ring" },
    { name: "Страница", token: "surface-page", hex: "#F8FAFC", className: "bg-surface-page border border-border" },
    { name: "Карточка", token: "surface-card", hex: "#FFFFFF", className: "bg-surface-card border border-border" },
    { name: "Текст muted", token: "muted", hex: "#64748B", className: "bg-muted" },
    { name: "Граница", token: "border", hex: "#E2E8F0", className: "bg-border" },
  ];

  return (
    <PublicShell>
      <p className="text-sm text-muted">
        Превью синей палитры ·{" "}
        <Link href="/" className="link-primary">
          на главную
        </Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-slate-900">
        Service Desk — синие тона
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Основной цвет для действий и ссылок, холодные slate-нейтрали для текста и границ. Зелёный
        ГС, янтарные звёзды и красные ошибки остаются смысловыми акцентами.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Палитра</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map((s) => (
            <li key={s.token} className="card flex items-center gap-4 p-4">
              <div className={`h-14 w-14 shrink-0 rounded-lg ${s.className}`} />
              <div className="min-w-0 text-sm">
                <div className="font-medium text-slate-900">{s.name}</div>
                <div className="font-mono text-xs text-muted">{s.hex}</div>
                <div className="truncate font-mono text-xs text-slate-500">{s.token}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Кнопки и ссылки</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary">
            Основная
          </button>
          <button type="button" className="btn-primary-lg">
            Крупная CTA
          </button>
          <button type="button" className="btn-secondary">
            Вторичная
          </button>
          <Link href="/login" className="link-primary text-sm font-medium">
            Ссылка-primary
          </Link>
        </div>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-medium">Карточка на главной</h2>
          <p className="mt-2 text-sm text-muted">
            Белая поверхность, серая граница, при наведении — синее кольцо.
          </p>
          <Link
            href="/order"
            className="mt-4 inline-block rounded-xl border border-border bg-surface-card p-4 shadow-sm transition-colors hover:border-primary-ring"
          >
            <span className="font-medium text-slate-900">Заказ услуги →</span>
          </Link>
        </div>
        <div className="surface-info">
          <strong className="font-medium">Информационный блок</strong>
          <p className="mt-1 text-muted">
            Подсказки, Telegram, контакты после согласия — мягкий синий фон.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Список исполнителей (фрагмент)</h2>
        <ul className="card mt-4 divide-y divide-border">
          <li className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              <span>ООО «Ремонт Плюс»</span>
              <GuaranteedSpecialistBadge />
            </div>
            <div className="mt-1 text-amber-600">★ 4.8 (12 оценок)</div>
            <div className="text-sm text-muted">Город: Алматы · Сантехника</div>
          </li>
          <li className="px-4 py-3">
            <div className="font-medium">Иван Петров</div>
            <div className="text-sm text-muted">Город: Астана · Электрика</div>
          </li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Шапка (как в приложении)</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-lg font-semibold text-slate-800">Service Desk</span>
            <nav className="flex gap-4 text-sm">
              <span className="text-muted">Исполнители</span>
              <span className="nav-link-active">Вход</span>
              <span className="rounded-lg bg-primary px-3 py-1.5 text-white">Регистрация</span>
            </nav>
          </div>
          <div className="bg-surface-page px-4 py-6 text-sm text-muted">
            Контент страницы на фоне surface-page (#F8FAFC)
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
