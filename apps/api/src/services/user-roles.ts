import type { Role } from "@service-desk/shared";
import type { UserDoc } from "../db/collections.js";

/** Роль contractor учитывается только после одобрения администратором */
export function getEffectiveRoles(user: UserDoc): Role[] {
  if (!user.roles.includes("contractor")) {
    return user.roles;
  }
  if (user.contractorApprovedAt) {
    return user.roles;
  }
  return user.roles.filter((r) => r !== "contractor");
}

export function isApprovedContractor(user: UserDoc): boolean {
  return user.roles.includes("contractor") && Boolean(user.contractorApprovedAt);
}

export function isGuaranteedSpecialist(user: UserDoc): boolean {
  return isApprovedContractor(user) && Boolean(user.guaranteedSpecialistAt);
}

export function isCustomer(user: UserDoc): boolean {
  return user.roles.includes("employee");
}
