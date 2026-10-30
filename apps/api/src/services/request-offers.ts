import { ObjectId } from "mongodb";
import type { ExpressWorkConsentInput, SubmitRequestOfferInput } from "@service-desk/shared";
import { buildContractorPortfolioText } from "@service-desk/shared";
import type {
  DbCollections,
  RequestOfferDoc,
  ServiceRequestDoc,
  UserDoc,
} from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import { isApprovedContractor } from "./user-roles.js";

export function isOpenForOffers(request: ServiceRequestDoc): boolean {
  if (request.assigneeId) return false;
  if (!["new", "under_review"].includes(request.status)) return false;
  if (request.validUntil && request.validUntil <= new Date()) return false;
  return true;
}

export function contractorMatchesCategory(user: UserDoc, request: ServiceRequestDoc): boolean {
  const cats = user.serviceCategoryIds ?? [];
  if (cats.length === 0) return false;
  return cats.some((id) => id.equals(request.categoryId));
}

export function canContractorViewOpenRequest(user: UserDoc, request: ServiceRequestDoc): boolean {
  return (
    isApprovedContractor(user) &&
    isOpenForOffers(request) &&
    contractorMatchesCategory(user, request)
  );
}

export function serializeOffer(doc: RequestOfferDoc, contractor?: UserDoc) {
  return {
    id: doc._id!.toString(),
    requestId: doc.requestId.toString(),
    contractorUserId: doc.contractorUserId.toString(),
    contractorName: contractor
      ? contractor.organizationName ?? contractor.fullName
      : undefined,
    contractorRating: contractor?.ratingAsContractor,
    portfolioPreview: contractor
      ? buildContractorPortfolioText({
          worksWithoutDocuments: contractor.worksWithoutDocuments,
          servicesDescription: contractor.servicesDescription,
        })
      : undefined,
    message: doc.message,
    availableFrom: doc.availableFrom,
    availableUntil: doc.availableUntil,
    proposedPrice: doc.proposedPrice,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

export function buildDefaultOfferWindow(request: ServiceRequestDoc): {
  availableFrom: Date;
  availableUntil: Date;
} {
  const availableFrom = new Date(Date.now() + 60 * 60 * 1000);
  const fallbackEnd = new Date(availableFrom.getTime() + 7 * 24 * 60 * 60 * 1000);
  const cap = request.validUntil ?? fallbackEnd;
  const availableUntil =
    cap.getTime() > availableFrom.getTime() ? cap : fallbackEnd;
  return { availableFrom, availableUntil };
}

export async function submitWorkConsent(
  collections: DbCollections,
  request: ServiceRequestDoc,
  contractor: UserDoc,
  body: ExpressWorkConsentInput,
): Promise<RequestOfferDoc> {
  const { availableFrom, availableUntil } = buildDefaultOfferWindow(request);
  const input: SubmitRequestOfferInput = {
    availableFrom: availableFrom.toISOString(),
    availableUntil: availableUntil.toISOString(),
    message: body.message ?? "Подтверждаю согласие на выполнение работ по заявке.",
    proposedPrice: body.proposedPrice,
    currency: body.currency,
  };
  return submitOffer(collections, request, contractor, input);
}

export async function listOffersForRequest(
  collections: DbCollections,
  requestId: ObjectId,
  viewer: UserDoc,
  request: ServiceRequestDoc,
) {
  const isRequester = request.requesterId.equals(viewer._id!);
  const filter: Record<string, unknown> = { requestId };
  if (!isRequester) {
    filter.contractorUserId = viewer._id!;
  } else {
    filter.status = "pending";
  }

  const offers = await collections.requestOffers.find(filter).sort({ createdAt: -1 }).toArray();
  const userIds = [...new Set(offers.map((o) => o.contractorUserId.toString()))];
  const users =
    userIds.length > 0
      ? await collections.users
          .find({ _id: { $in: offers.map((o) => o.contractorUserId) } })
          .toArray()
      : [];
  const userMap = new Map(users.map((u) => [u._id!.toString(), u]));

  return offers.map((o) => serializeOffer(o, userMap.get(o.contractorUserId.toString())));
}

export async function submitOffer(
  collections: DbCollections,
  request: ServiceRequestDoc,
  contractor: UserDoc,
  body: SubmitRequestOfferInput,
): Promise<RequestOfferDoc> {
  if (!isApprovedContractor(contractor)) {
    throw new AppError(403, "Исполнитель не одобрен");
  }
  if (!isOpenForOffers(request)) {
    throw new AppError(400, "Заявка не принимает отклики");
  }
  if (!contractorMatchesCategory(contractor, request)) {
    throw new AppError(403, "Эта категория услуг не входит в ваш профиль");
  }

  const availableFrom = new Date(body.availableFrom);
  const availableUntil = new Date(body.availableUntil);
  const validUntil = request.validUntil ?? availableUntil;

  if (availableUntil > validUntil) {
    throw new AppError(400, "Время выполнения не должно выходить за срок действия заявки");
  }
  const graceMs = 5 * 60 * 1000;
  if (availableFrom.getTime() < Date.now() - graceMs) {
    throw new AppError(400, "Начало выполнения не может быть в прошлом");
  }

  const existing = await collections.requestOffers.findOne({
    requestId: request._id!,
    contractorUserId: contractor._id!,
  });

  const payload = {
    message: body.message,
    availableFrom,
    availableUntil,
    proposedPrice: body.proposedPrice,
    currency: body.currency ?? request.currency,
    status: "pending" as const,
  };

  if (existing) {
    if (existing.status === "accepted") {
      throw new AppError(409, "Вы уже выбраны исполнителем по этой заявке");
    }
    await collections.requestOffers.updateOne(
      { _id: existing._id! },
      { $set: payload },
    );
    const updated = await collections.requestOffers.findOne({ _id: existing._id! });
    return updated!;
  }

  const doc: RequestOfferDoc = {
    requestId: request._id!,
    contractorUserId: contractor._id!,
    ...payload,
    createdAt: new Date(),
  };
  const result = await collections.requestOffers.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function selectOffer(
  collections: DbCollections,
  request: ServiceRequestDoc,
  customer: UserDoc,
  offerId: string,
): Promise<ServiceRequestDoc> {
  if (!request.requesterId.equals(customer._id!)) {
    throw new AppError(403, "Только заказчик может выбрать исполнителя");
  }
  if (!isOpenForOffers(request)) {
    throw new AppError(400, "Исполнитель уже выбран или заявка закрыта для откликов");
  }
  if (!ObjectId.isValid(offerId)) throw new AppError(400, "Некорректный отклик");

  const offer = await collections.requestOffers.findOne({
    _id: new ObjectId(offerId),
    requestId: request._id!,
    status: "pending",
  });
  if (!offer) throw new AppError(404, "Отклик не найден");

  const now = new Date();
  await collections.requestOffers.updateOne({ _id: offer._id! }, { $set: { status: "accepted" } });
  await collections.requestOffers.updateMany(
    { requestId: request._id!, _id: { $ne: offer._id! }, status: "pending" },
    { $set: { status: "rejected" } },
  );

  await collections.serviceRequests.updateOne(
    { _id: request._id! },
    {
      $set: {
        status: "assigned",
        assigneeId: offer.contractorUserId,
        scheduledStart: offer.availableFrom,
        scheduledEnd: offer.availableUntil,
        dueAt: offer.availableUntil,
        updatedAt: now,
        ...(offer.proposedPrice !== undefined ? { estimatedCost: offer.proposedPrice } : {}),
        ...(offer.currency ? { currency: offer.currency } : {}),
      },
    },
  );

  const updated = await collections.serviceRequests.findOne({ _id: request._id! });
  return updated!;
}

export function openMarketFilterForContractor(user: UserDoc): Record<string, unknown> {
  const categoryIds = user.serviceCategoryIds ?? [];
  if (categoryIds.length === 0) {
    return { _id: null };
  }
  return {
    status: { $in: ["new", "under_review"] },
    assigneeId: { $exists: false },
    categoryId: { $in: categoryIds },
    $or: [{ validUntil: { $exists: false } }, { validUntil: { $gt: new Date() } }],
  };
}
