import type { ObjectId } from "mongodb";
import type { DbCollections, ServiceRequestDoc, UserDoc } from "../db/collections.js";

export type PartyContact = {
  fullName: string;
  email: string;
  phone?: string;
  organizationName?: string;
  city?: string;
  /** Контактное лицо из заявки (для исполнителя) */
  contactPerson?: string;
};

export function toPartyContact(user: UserDoc, extra?: { contactPerson?: string }): PartyContact {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    organizationName: user.organizationName,
    city: user.city,
    contactPerson: extra?.contactPerson,
  };
}

/** Контакты второй стороны — только после выбора исполнителя */
export async function resolveCounterpartyContact(
  collections: DbCollections,
  request: ServiceRequestDoc,
  viewer: UserDoc,
): Promise<PartyContact | null> {
  if (!request.assigneeId) return null;

  const viewerId = viewer._id!.toString();
  const isRequester = request.requesterId.equals(viewer._id!);
  const isAssignee = request.assigneeId.equals(viewer._id!);
  if (!isRequester && !isAssignee) return null;

  if (isRequester) {
    const assignee = await collections.users.findOne({ _id: request.assigneeId });
    if (!assignee) return null;
    return toPartyContact(assignee);
  }

  const requester = await collections.users.findOne({ _id: request.requesterId });
  if (!requester) return null;
  return toPartyContact(requester, {
    contactPerson: request.contactPerson,
  });
}
