"use client";

export function ListWhyDisclosure({
  summary = "Почему показывается этот список?",
  children,
  className = "",
}: {
  summary?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <details
      className={`rounded-lg border border-slate-200 bg-slate-50 text-sm open:bg-white ${className}`}
    >
      <summary className="cursor-pointer list-none px-3 py-2.5 font-medium text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-primary-strong">{summary}</span>
      </summary>
      <div className="border-t border-slate-200 px-3 py-2.5 text-slate-600 leading-relaxed">
        {children}
      </div>
    </details>
  );
}
