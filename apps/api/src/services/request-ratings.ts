import type { ObjectId } from "mongodb";
import type {
  DbCollections,
  RequestRatingDoc,
  RequestRatingKind,
  ServiceRequestDoc,
  UserDoc,
} from "../db/collections.js";
import { AppError } from "../lib/errors.js";
import { isAssignee } from "./request-access.js";

export type RequestRatingsView = {
  work: SerializedRating | null;
  customerConduct: SerializedRating | null;
  pendingKind: RequestRatingKind | null;
  bothSubmitted: boolean;
};

type SerializedRating = {
  score: number;
  comment?: string;
  fromUserId: string;
  toUserId: string;
  createdAt: Date;
};

function serializeRating(doc: RequestRatingDoc): SerializedRating {
  return {
    score: doc.score,
    comment: doc.comment,
    fromUserId: doc.fromUserId.toString(),
    toUserId: doc.toUserId.toString(),
    createdAt: doc.createdAt,
  };
}

export function ratingKindForUser(
  user: UserDoc,
  request: ServiceRequestDoc,
): RequestRatingKind | null {
  if (request.requesterId.equals(user._id!)) return "work";
  if (isAssignee(user, request)) return "customer_conduct";
  return null;
}

export function resolveRatingTargetUserId(
  request: ServiceRequestDoc,
  kind: RequestRatingKind,
): ObjectId {
  if (kind === "work") {
    if (!request.assigneeId) {
      throw new AppError(400, "У заявки нет назначенного исполнителя");
    }
    return request.assigneeId;
  }
  return request.requesterId;
}

export async function getRequestRatingsView(
  collections: DbCollections,
  request: ServiceRequestDoc,
  viewer: UserDoc,
): Promise<RequestRatingsView> {
  const docs = await collections.requestRatings.find({ requestId: request._id! }).toArray();
  const work = docs.find((d) => d.kind === "work") ?? null;
  const customerConduct = docs.find((d) => d.kind === "customer_conduct") ?? null;
  const bothSubmitted = Boolean(work && customerConduct);

  let pendingKind: RequestRatingKind | null = null;
  if (request.status === "completed") {
    const mine = ratingKindForUser(viewer, request);
    if (mine === "work" && !work) pendingKind = "work";
    if (mine === "customer_conduct" && !customerConduct) pendingKind = "customer_conduct";
  }

  return {
    work: work ? serializeRating(work) : null,
    customerConduct: customerConduct ? serializeRating(customerConduct) : null,
    pendingKind,
    bothSubmitted,
  };
}

async function refreshUserRatingAggregate(
  collections: DbCollections,
  userId: ObjectId,
  kind: RequestRatingKind,
): Promise<void> {
  const field = kind === "work" ? "ratingAsContractor" : "ratingAsCustomer";
  const rows = await collections.requestRatings.find({ toUserId: userId, kind }).toArray();
  const count = rows.length;
  if (count === 0) {
    await collections.users.updateOne(
      { _id: userId },
      { $unset: { [field]: "" }, $set: { updatedAt: new Date() } },
    );
    return;
  }
  const avg = rows.reduce((sum, r) => sum + r.score, 0) / count;
  await collections.users.updateOne(
    { _id: userId },
    {
      $set: {
        [field]: { avg: Math.round(avg * 100) / 100, count },
        updatedAt: new Date(),
      },
    },
  );
}

export async function submitRequestRating(
  collections: DbCollections,
  request: ServiceRequestDoc,
  user: UserDoc,
  kind: RequestRatingKind,
  score: number,
  comment?: string,
): Promise<{ closed: boolean }> {
  if (request.status !== "completed") {
    throw new AppError(400, "Оценку можно оставить после выполнения работ");
  }

  const expectedKind = ratingKindForUser(user, request);
  if (!expectedKind || expectedKind !== kind) {
    throw new AppError(403, "Нельзя оставить эту оценку");
  }

  const toUserId = resolveRatingTargetUserId(request, kind);

  const existing = await collections.requestRatings.findOne({ requestId: request._id!, kind });
  if (existing) {
    throw new AppError(409, "Оценка уже отправлена");
  }

  const doc: RequestRatingDoc = {
    requestId: request._id!,
    fromUserId: user._id!,
    toUserId,
    kind,
    score,
    comment,
    createdAt: new Date(),
  };
  await collections.requestRatings.insertOne(doc);
  await refreshUserRatingAggregate(collections, toUserId, kind);

  const otherKind: RequestRatingKind = kind === "work" ? "customer_conduct" : "work";
  const other = await collections.requestRatings.findOne({
    requestId: request._id!,
    kind: otherKind,
  });

  if (other) {
    const now = new Date();
    await collections.serviceRequests.updateOne(
      { _id: request._id! },
      { $set: { status: "closed", closedAt: now, updatedAt: now } },
    );
    return { closed: true };
  }

  return { closed: false };
}
