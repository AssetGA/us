"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { BecomeContractorForm } from "@/components/BecomeContractorForm";
import { ContractorProfileEditor } from "@/components/ContractorProfileEditor";
import { CustomerProfileSummary } from "@/components/CustomerProfileSummary";
import { TelegramNotificationsLink } from "@/components/TelegramNotificationsLink";
import { ProfileParticipationSwitch } from "@/components/ProfileParticipationSwitch";
import { api, type ApiUser } from "@/lib/api";
import { hasContractorRole, hasCustomerRole } from "@/lib/participation";
import { useParticipationMode } from "@/hooks/useParticipationMode";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [showContractorSetup, setShowContractorSetup] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => router.push("/login"));
  }, [router]);

  const participation = useParticipationMode(user);

  if (!user) return null;

  const isContractor = hasContractorRole(user);
  const isCustomer = hasCustomerRole(user);
  const contractorView = participation === "contractor";
  const needContractorOnboarding = contractorView && !isContractor;

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">Профиль</h1>
      <ProfileParticipationSwitch
        user={user}
        onUserUpdated={setUser}
        onRequestContractorSetup={() => setShowContractorSetup(true)}
      />

      {contractorView && isContractor && (
        <>
          <ContractorProfileEditor user={user} onUpdated={setUser} />
          <TelegramNotificationsLink user={user} />
        </>
      )}

      {(needContractorOnboarding || showContractorSetup) && isCustomer && !isContractor && (
        <BecomeContractorForm
          user={user}
          onDone={(u) => {
            setUser(u);
            setShowContractorSetup(false);
          }}
        />
      )}

      {!contractorView && isCustomer && (
        <>
          <CustomerProfileSummary user={user} />
          <TelegramNotificationsLink user={user} />
        </>
      )}

      {!contractorView && !isCustomer && isContractor && (
        <p className="mt-6 text-sm text-slate-600">
          Нажмите «Заказчик» выше, чтобы включить режим заказчика с теми же данными аккаунта.
        </p>
      )}
    </AppShell>
  );
}
