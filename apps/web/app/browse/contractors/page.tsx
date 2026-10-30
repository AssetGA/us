import { AuthGateBanner } from "@/components/AuthGateHint";
import { PublicContractorsSection } from "@/components/PublicContractorsSection";
import { PublicShell } from "@/components/PublicShell";

export default function BrowseContractorsPage() {
  const nextAfterAuth = "/register/contractor";

  return (
    <PublicShell>
      <h1 className="text-2xl font-semibold">Исполнители</h1>
      <p className="mt-2 text-sm text-slate-600">
        Каталог одобренных исполнителей — просмотр без регистрации.
      </p>
      <div className="mt-4">
        <AuthGateBanner nextAfterAuth={nextAfterAuth} />
      </div>
      <PublicContractorsSection className="mt-6" />
    </PublicShell>
  );
}
