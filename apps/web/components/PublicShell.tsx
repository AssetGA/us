import { PublicSiteHeader } from "@/components/PublicSiteHeader";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-page text-slate-900">
      <PublicSiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6 md:py-8">{children}</main>
    </div>
  );
}
