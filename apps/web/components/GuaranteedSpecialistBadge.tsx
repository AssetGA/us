/** Значок «ГС» — гарантированный специалист (присваивает администратор) */
export function GuaranteedSpecialistBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border border-emerald-600/40 bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold tracking-wide text-emerald-800 ${className}`}
      title="Гарантированный специалист"
      aria-label="Гарантированный специалист"
    >
      ГС
    </span>
  );
}
