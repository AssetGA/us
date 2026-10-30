import { Suspense } from "react";
import { RegisterForm, RegisterPageLayout } from "@/components/RegisterForm";

export default function RegisterContractorPage() {
  return (
    <RegisterPageLayout>
      <Suspense fallback={<div className="text-sm text-slate-600">Загрузка…</div>}>
        <RegisterForm mode="contractor" />
      </Suspense>
    </RegisterPageLayout>
  );
}
