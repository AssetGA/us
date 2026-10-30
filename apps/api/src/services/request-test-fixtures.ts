import { ObjectId } from "mongodb";
import type { RequestOfferDoc, ServiceRequestDoc, UserDoc } from "../db/collections.js";

export function makeRequest(overrides: Partial<ServiceRequestDoc> = {}): ServiceRequestDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    number: "REQ-001",
    title: "Test",
    description: "Test description long enough",
    categoryId: new ObjectId(),
    requesterId: new ObjectId(),
    location: { site: "A" },
    priority: "normal",
    status: "new",
    validUntil: new Date(now.getTime() + 7 * 86400000),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeContractor(
  categoryId: ObjectId,
  overrides: Partial<UserDoc> = {},
): UserDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    fullName: "Исполнитель Тест",
    email: "contractor@test.local",
    phone: "+77001112233",
    passwordHash: "x",
    roles: ["contractor"],
    status: "active",
    contractorApprovedAt: now,
    serviceCategoryIds: [categoryId],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<UserDoc> = {}): UserDoc {
  const now = new Date();
  return {
    _id: new ObjectId(),
    fullName: "Заказчик Тест",
    email: "customer@test.local",
    phone: "+77009998877",
    passwordHash: "x",
    roles: ["employee"],
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function makeOffer(
  requestId: ObjectId,
  contractorUserId: ObjectId,
  overrides: Partial<RequestOfferDoc> = {},
): RequestOfferDoc {
  const from = new Date(Date.now() + 3600_000);
  const until = new Date(Date.now() + 86400000);
  return {
    _id: new ObjectId(),
    requestId,
    contractorUserId,
    availableFrom: from,
    availableUntil: until,
    status: "pending",
    createdAt: new Date(),
    ...overrides,
  };
}
