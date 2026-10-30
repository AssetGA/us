import { hasPermission } from "@service-desk/shared";
import type { ServiceRequestDoc, UserDoc } from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import { canContractorViewOpenRequest } from "./request-offers.js";
import { getEffectiveRoles, isApprovedContractor } from "./user-roles.js";

export function assertCanReadRequest(user: UserDoc, request: ServiceRequestDoc): void {
  const roles = getEffectiveRoles(user);
  if (hasPermission(roles, "requests:read_all")) return;
  if (
    hasPermission(roles, "requests:read_own") &&
    request.requesterId.equals(user._id)
  ) {
    return;
  }
  if (hasPermission(roles, "requests:read_assigned")) {
    if (request.assigneeId?.equals(user._id)) return;
    if (
      user.contractorId &&
      request.contractorId?.equals(user.contractorId)
    ) {
      return;
    }
  }
  if (canContractorViewOpenRequest(user, request)) return;
  throw new AppError(403, "Access denied");
}

export function assertPermission(user: UserDoc, permission: Parameters<typeof hasPermission>[1]): void {
  if (!hasPermission(getEffectiveRoles(user), permission)) {
    throw new AppError(403, "Access denied");
  }
}

export function isAssignee(user: UserDoc, request: ServiceRequestDoc): boolean {
  if (request.assigneeId?.equals(user._id)) return true;
  if (
    isApprovedContractor(user) &&
    user.contractorId &&
    request.contractorId?.equals(user.contractorId)
  ) {
    return true;
  }
  return false;
}

export function buildRequestListFilter(user: UserDoc): Record<string, unknown> {
  const roles = getEffectiveRoles(user);
  if (hasPermission(roles, "requests:read_all")) {
    return {};
  }
  const or: Record<string, unknown>[] = [];
  if (hasPermission(roles, "requests:read_own")) {
    or.push({ requesterId: user._id });
  }
  if (hasPermission(roles, "requests:read_assigned")) {
    or.push({ assigneeId: user._id });
    if (user.contractorId) {
      or.push({ contractorId: user.contractorId });
    }
  }
  if (or.length === 0) {
    return { _id: null };
  }
  return { $or: or };
}
