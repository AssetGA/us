"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ParticipationTypeSwitch } from "@/components/ParticipationTypeSwitch";
import { api, type ApiUser } from "@/lib/api";
import {
  hasContractorRole,
  hasCustomerRole,
  resolveParticipationMode,
  setParticipationMode,
  type ParticipationMode,
  PARTICIPATION_MODE_EVENT,
} from "@/lib/participation";

export function ProfileParticipationSwitch({
  user,
  onUserUpdated,
  onRequestContractorSetup,
}: {
  user: ApiUser;
  onUserUpdated: (u: ApiUser) => void;
  onRequestContractorSetup: () => void;
}) {
  const router = useRouter();
  const [active, setActive] = useState<ParticipationMode>(() => resolveParticipationMode(user));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setActive(resolveParticipationMode(user));
    const sync = () => setActive(resolveParticipationMode(user));
    window.addEventListener(PARTICIPATION_MODE_EVENT, sync);
    return () => window.removeEventListener(PARTICIPATION_MODE_EVENT, sync);
  }, [user]);

  async function onSelect(mode: ParticipationMode) {
    setNotice("");
    if (mode === "contractor" && !hasContractorRole(user)) {
      setParticipationMode("contractor");
      setActive("contractor");
      onRequestContractorSetup();
      return;
    }
    if (mode === "customer" && !hasCustomerRole(user)) {
      setBusy(true);
      try {
        const res = await api.becomeCustomer();
        onUserUpdated(res.user);
        setParticipationMode("customer");
        setActive("customer");
        setNotice(res.message ?? "");
        router.push("/dashboard");
        router.refresh();
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Не удалось включить режим заказчика");
      } finally {
        setBusy(false);
      }
      return;
    }
    setParticipationMode(mode);
    setActive(mode);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <section className="mt-4 max-w-lg">
      <h2 className="text-sm font-medium text-slate-700">Тип участия</h2>
      <div className="mt-2">
        <ParticipationTypeSwitch
          variant="profile"
          active={active}
          hasCustomer={hasCustomerRole(user)}
          hasContractor={hasContractorRole(user)}
          onSelect={onSelect}
          disabled={busy}
        />
      </div>
      {notice && <p className="mt-2 text-sm text-slate-600">{notice}</p>}
    </section>
  );
}
