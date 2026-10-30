import Link from "next/link";
import { AuthGateBanner } from "@/components/AuthGateHint";
import { PublicShell } from "@/components/PublicShell";
import { registerUrl } from "@/lib/auth-redirect";

const orderNext = "/requests/new";

export default function OrderServicePage() {
  return (
    <PublicShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Заказ услуги</h1>
          <p className="mt-2 text-sm text-slate-600">
            Создание новой заявки — нужна регистрация заказчика.
          </p>
        </div>
        <Link
          href={registerUrl(orderNext)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Оформить заказ
        </Link>
      </div>
      <div className="mt-4">
        <AuthGateBanner nextAfterAuth={orderNext} />
      </div>
      <p className="mt-6 text-sm text-slate-600">
        <Link href="/" className="text-primary hover:underline">
          На главной
        </Link>{" "}
        — каталог заказов с фильтрами.
      </p>
    </PublicShell>
  );
}
