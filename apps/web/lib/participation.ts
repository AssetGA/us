import type { ApiUser } from "@/lib/api";

export type ParticipationMode = "customer" | "contractor";

const STORAGE_KEY = "sd_participation_mode";
export const PARTICIPATION_MODE_EVENT = "sd-participation-mode";

export function hasCustomerRole(user: { roles: string[] }) {
  return user.roles.includes("employee");
}

export function hasContractorRole(user: { roles: string[] }) {
  return user.roles.includes("contractor");
}

/** Режим интерфейса: при двух ролях — переключатель в профиле */
export function resolveParticipationMode(user: { roles: string[] }): ParticipationMode {
  const isCustomer = hasCustomerRole(user);
  const isContractor = hasContractorRole(user);
  if (isCustomer && !isContractor) return "customer";
  if (isContractor && !isCustomer) return "contractor";
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "customer" && isCustomer) return "customer";
    if (stored === "contractor" && isContractor) return "contractor";
  }
  return isCustomer ? "customer" : "contractor";
}

export function setParticipationMode(mode: ParticipationMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new Event(PARTICIPATION_MODE_EVENT));
}
