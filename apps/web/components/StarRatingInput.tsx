"use client";

export function StarRatingInput({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (score: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
      <p className="text-sm font-medium text-slate-800">{label}</p>
      {hint && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            disabled={disabled}
            onClick={() => onChange(n)}
            className={`rounded px-2 py-1 text-2xl leading-none transition-colors disabled:opacity-40 ${
              n <= value ? "text-amber-500 hover:text-amber-600" : "text-slate-300 hover:text-slate-400"
            }`}
            aria-label={`${n} из 5`}
          >
            ★
          </button>
        ))}
      </div>
      {value > 0 ? (
        <p className="mt-1 text-xs text-slate-500">Выбрано: {value} из 5</p>
      ) : (
        <p className="mt-1 text-xs text-amber-800">Выберите от 1 до 5 звёзд</p>
      )}
    </div>
  );
}
