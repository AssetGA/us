import Link from "next/link";
import { PublicRequestsSection } from "@/components/PublicRequestsSection";
import { PublicShell } from "@/components/PublicShell";

export default function HomePage() {
  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold">Услуги для дома и офиса</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Каталог заказов и исполнителей — просмотр без регистрации. Чтобы создать заказ или
        зарегистрироваться как исполнитель, понадобится аккаунт.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/order"
          className="card p-6 transition-colors hover:border-primary-ring"
        >
          <h2 className="text-lg font-medium">Заказ услуги</h2>
          <p className="mt-2 text-sm text-slate-600">
            Оформление новой заявки после регистрации.
          </p>
        </Link>
        <Link
          href="/browse/contractors"
          className="card p-6 transition-colors hover:border-primary-ring"
        >
          <h2 className="text-lg font-medium">Исполнители</h2>
          <p className="mt-2 text-sm text-slate-600">
            Каталог с фильтрами по городу и услуге.
          </p>
        </Link>
      </div>
      <PublicRequestsSection className="mt-12 border-t border-slate-200 pt-10" />
    </PublicShell>
  );
}
