import { redirect } from "next/navigation";
import { Suspense } from "react";
import { RegisterForm, RegisterPageLayout } from "@/components/RegisterForm";

export default async function RegisterCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ contractor?: string }>;
}) {
  const sp = await searchParams;
  if (sp.contractor === "1") redirect("/register/contractor");

  return (
    <RegisterPageLayout>
      <Suspense fallback={<div className="text-sm text-slate-600">Загрузка…</div>}>
        <RegisterForm mode="customer" />
      </Suspense>
    </RegisterPageLayout>
  );
}
