import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import {
  createRequestSchema,
  assignRequestSchema,
  commentSchema,
  completeRequestSchema,
  rejectAssignmentSchema,
  requestListQuerySchema,
  updateRequestPriceSchema,
  submitRequestRatingSchema,
  submitRequestOfferSchema,
  expressWorkConsentSchema,
  selectRequestOfferSchema,
  hasPermission,
} from "@service-desk/shared";
import {
  canContractorViewOpenRequest,
  isOpenForOffers,
  listOffersForRequest,
  openMarketFilterForContractor,
  selectOffer,
  submitOffer,
  submitWorkConsent,
} from "../services/request-offers.js";
import { resolveCounterpartyContact } from "../services/request-contacts.js";
import { isApprovedContractor, isCustomer } from "../services/user-roles.js";
import {
  getRequestRatingsView,
  submitRequestRating,
} from "../services/request-ratings.js";
import { applyRequestListQuery } from "../services/request-filters.js";
import { requireAuth } from "../middleware/context.js";
import { AppError, sendError } from "../lib/errors.js";
import {
  assertCanReadRequest,
  assertPermission,
  buildRequestListFilter,
  isAssignee,
} from "../services/request-access.js";
import { generateRequestNumber } from "../lib/request-number.js";
import { createNotification, type NotificationDelivery } from "../lib/notifications.js";
import {
  assertTelegramLinkedIfRequired,
  notifyMatchingContractorsNewRequest,
} from "../services/telegram-notifications.js";
import type { DbCollections } from "../db/collections.js";
import { scheduleRequestWorkNotificationsExpiry } from "../services/request-notification-retention.js";
import { requestWorkNotificationsExpireAt } from "@service-desk/shared";
import { paramId } from "../lib/params.js";

function requestNotifyDelivery(req: Request): NotificationDelivery {
  return {
    env: req.appLocals.env,
    webOrigin: req.appLocals.env.WEB_ORIGIN,
  };
}

async function notifyRequest(
  req: Request,
  collections: DbCollections,
  params: Parameters<typeof createNotification>[1],
) {
  await createNotification(collections, params, requestNotifyDelivery(req));
}
import type { RequestEventInsert, ServiceRequestInsert } from "../db/collections.js";

const router = Router();

function serializeRequest(doc: Record<string, unknown>) {
  const r = doc as {
    _id: ObjectId;
    categoryId: ObjectId;
    requesterId: ObjectId;
    contractorId?: ObjectId;
    assigneeId?: ObjectId;
    responsibleId?: ObjectId;
    [key: string]: unknown;
  };
  return {
    ...r,
    id: r._id.toString(),
    _id: undefined,
    categoryId: r.categoryId.toString(),
    requesterId: r.requesterId.toString(),
    contractorId: r.contractorId?.toString(),
    assigneeId: r.assigneeId?.toString(),
    responsibleId: r.responsibleId?.toString(),
  };
}

async function addEvent(
  req: Request,
  requestId: ObjectId,
  type: string,
  payload: Record<string, unknown>,
) {
  const event: RequestEventInsert = {
    requestId,
    type,
    actorId: req.user?._id,
    payload,
    createdAt: new Date(),
  };
  await req.appLocals.collections.requestEvents.insertOne(event);
}

function requestObjectId(req: Request): ObjectId {
  const pid = paramId(req.params.id);
  if (!ObjectId.isValid(pid)) throw new AppError(404, "Not found");
  return new ObjectId(pid);
}

router.post("/", requireAuth, async (req, res) => {
  try {
    if (!isCustomer(req.user!)) {
      throw new AppError(403, "Заявки создаёт только заказчик");
    }
    assertPermission(req.user!, "requests:create");
    const body = createRequestSchema.parse(req.body);
    const validUntil = new Date(body.validUntil);
    if (validUntil <= new Date()) {
      throw new AppError(400, "Срок действия заявки должен быть в будущем");
    }
    const { collections } = req.appLocals;
    if (!ObjectId.isValid(body.categoryId)) {
      throw new AppError(400, "Invalid category");
    }
    const category = await collections.categories.findOne({
      _id: new ObjectId(body.categoryId),
      isActive: true,
    });
    if (!category) throw new AppError(400, "Category not found");
    assertTelegramLinkedIfRequired(
      req.appLocals.env,
      req.user!,
      "Чтобы создавать заявки и получать отклики в Telegram,",
    );
    const now = new Date();
    const number = await generateRequestNumber(collections);
    const doc: ServiceRequestInsert = {
      number,
      title: body.title,
      description: body.description,
      categoryId: new ObjectId(body.categoryId),
      requesterId: req.user!._id!,
      location: body.location,
      priority: body.priority,
      status: "new",
      dueAt: body.dueAt ? new Date(body.dueAt) : undefined,
      equipment: body.equipment,
      inventoryNumber: body.inventoryNumber,
      contactPerson: body.contactPerson,
      proposedPrice: body.proposedPrice,
      currency: body.currency ?? "KZT",
      validUntil,
      createdAt: now,
      updatedAt: now,
    };
    const result = await collections.serviceRequests.insertOne(doc);
    await addEvent(req, result.insertedId, "created", { number });
    const dispatchers = await collections.users
      .find({ roles: "dispatcher", status: "active" })
      .toArray();
    const requestIdStr = result.insertedId.toString();
    for (const d of dispatchers) {
      await notifyRequest(req, collections, {
        userId: d._id!,
        type: "request.new",
        title: "Новая заявка",
        body: `${number}: ${body.title}`,
        meta: { requestId: requestIdStr },
      });
    }
    const savedRequest = { ...doc, _id: result.insertedId };
    await notifyMatchingContractorsNewRequest(
      collections,
      req.appLocals.env,
      req.appLocals.env.WEB_ORIGIN,
      savedRequest,
      number,
      body.title,
      async (userId, type, title, nBody, meta) => {
        await notifyRequest(req, collections, {
          userId,
          type,
          title,
          body: nBody,
          meta,
        });
      },
    );
    res.status(201).json({ request: serializeRequest(savedRequest as Record<string, unknown>) });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/contractor-home", requireAuth, async (req, res) => {
  try {
    if (!isApprovedContractor(req.user!)) {
      throw new AppError(403, "Доступно одобренным исполнителям");
    }
    const { collections } = req.appLocals;
    const query = requestListQuerySchema.parse(req.query);
    const base = {
      $or: [openMarketFilterForContractor(req.user!), { assigneeId: req.user!._id }],
    };
    const filter = applyRequestListQuery(base, query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      collections.serviceRequests
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collections.serviceRequests.countDocuments(filter),
    ]);
    res.json({
      items: items.map((i) => serializeRequest(i as Record<string, unknown>)),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/open-market", requireAuth, async (req, res) => {
  try {
    if (!isApprovedContractor(req.user!)) {
      throw new AppError(403, "Доступно одобренным исполнителям");
    }
    const { collections } = req.appLocals;
    const query = requestListQuerySchema.parse(req.query);
    const filter = applyRequestListQuery(openMarketFilterForContractor(req.user!), query);
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      collections.serviceRequests
        .find(filter)
        .sort({ validUntil: 1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collections.serviceRequests.countDocuments(filter),
    ]);
    res.json({
      items: items.map((i) => serializeRequest(i as Record<string, unknown>)),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const query = requestListQuerySchema.parse(req.query);
    const filter = applyRequestListQuery(
      buildRequestListFilter(req.user!),
      query,
    );
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await Promise.all([
      collections.serviceRequests
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collections.serviceRequests.countDocuments(filter),
    ]);
    res.json({
      items: items.map((i) => serializeRequest(i as Record<string, unknown>)),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.patch("/:id/price", requireAuth, async (req, res) => {
  try {
    assertPermission(req.user!, "requests:assign");
    const body = updateRequestPriceSchema.parse(req.body);
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (body.estimatedCost !== undefined) update.estimatedCost = body.estimatedCost;
    if (body.proposedPrice !== undefined) update.proposedPrice = body.proposedPrice;
    if (body.finalPrice !== undefined) update.finalPrice = body.finalPrice;
    if (body.currency) update.currency = body.currency;
    await req.appLocals.collections.serviceRequests.updateOne({ _id: id }, { $set: update });
    await addEvent(req, id, "price_updated", { ...body });
    const updated = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    res.json({ request: serializeRequest(updated! as Record<string, unknown>) });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({
      _id: id,
    });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);
    const ratings = await getRequestRatingsView(
      req.appLocals.collections,
      request,
      req.user!,
    );
    const offers =
      request.requesterId.equals(req.user!._id!) || canContractorViewOpenRequest(req.user!, request)
        ? await listOffersForRequest(req.appLocals.collections, id, req.user!, request)
        : [];

    const counterpartyContact = await resolveCounterpartyContact(
      req.appLocals.collections,
      request,
      req.user!,
    );

    res.json({
      request: serializeRequest(request as Record<string, unknown>),
      ratings,
      offers,
      openForOffers: isOpenForOffers(request),
      counterpartyContact,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/offers", requireAuth, async (req, res) => {
  try {
    const body = submitRequestOfferSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);
    assertTelegramLinkedIfRequired(
      req.appLocals.env,
      req.user!,
      "Чтобы откликаться на заказы и получать назначения в Telegram,",
    );
    const offer = await submitOffer(collections, request, req.user!, body);
    await addEvent(req, id, "offer_submitted", {
      offerId: offer._id!.toString(),
      availableFrom: offer.availableFrom,
      availableUntil: offer.availableUntil,
    });
    await notifyRequest(req, collections, {
      userId: request.requesterId,
      type: "request.offer",
      title: "Новый отклик исполнителя",
      body: request.number,
      meta: { requestId: id.toString(), offerId: offer._id!.toString() },
    });
    const contractor = req.user!;
    res.status(201).json({
      offer: {
        id: offer._id!.toString(),
        availableFrom: offer.availableFrom,
        availableUntil: offer.availableUntil,
        status: offer.status,
        contractorName: contractor.organizationName ?? contractor.fullName,
      },
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/work-consent", requireAuth, async (req, res) => {
  try {
    const body = expressWorkConsentSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);
    assertTelegramLinkedIfRequired(
      req.appLocals.env,
      req.user!,
      "Чтобы откликаться на заказы и получать назначения в Telegram,",
    );
    const offer = await submitWorkConsent(collections, request, req.user!, body);
    await addEvent(req, id, "work_consent", { offerId: offer._id!.toString() });
    await notifyRequest(req, collections, {
      userId: request.requesterId,
      type: "request.offer",
      title: "Исполнитель готов выполнить заказ",
      body: `${request.number}: ${req.user!.organizationName ?? req.user!.fullName}`,
      meta: { requestId: id.toString(), offerId: offer._id!.toString() },
    });
    res.status(201).json({
      offer: {
        id: offer._id!.toString(),
        status: offer.status,
        availableFrom: offer.availableFrom,
        availableUntil: offer.availableUntil,
      },
      message: "Согласие отправлено заказчику. Контакты откроются после выбора исполнителя.",
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/select-offer", requireAuth, async (req, res) => {
  try {
    const body = selectRequestOfferSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    const updated = await selectOffer(collections, request, req.user!, body.offerId);
    await addEvent(req, id, "offer_selected", { offerId: body.offerId });
    if (updated.assigneeId) {
      await notifyRequest(req, collections, {
        userId: updated.assigneeId,
        type: "request.assigned",
        title: "Вас выбрали исполнителем",
        body: `${updated.number}. Контакты заказчика доступны в заявке.`,
        meta: { requestId: id.toString() },
      });
      await notifyRequest(req, collections, {
        userId: updated.requesterId,
        type: "request.assigned",
        title: "Исполнитель согласован",
        body: `${updated.number}. Контакты исполнителя доступны в заявке.`,
        meta: { requestId: id.toString() },
      });
    }
    const counterpartyContact = await resolveCounterpartyContact(
      collections,
      updated,
      req.user!,
    );
    res.json({
      request: serializeRequest(updated as Record<string, unknown>),
      counterpartyContact,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/ratings", requireAuth, async (req, res) => {
  try {
    const body = submitRequestRatingSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);

    const kind =
      request.requesterId.equals(req.user!._id!) ? "work" : isAssignee(req.user!, request)
        ? "customer_conduct"
        : null;
    if (!kind) throw new AppError(403, "Access denied");

    const comment = kind === "customer_conduct" ? undefined : body.comment;

    const { closed } = await submitRequestRating(
      collections,
      request,
      req.user!,
      kind,
      body.score,
      comment,
    );
    await addEvent(req, id, "rated", { kind, score: body.score });
    if (closed) {
      await addEvent(req, id, "closed", { reason: "both_ratings" });
    }
    const updated = await collections.serviceRequests.findOne({ _id: id });
    const ratings = await getRequestRatingsView(collections, updated!, req.user!);
    res.json({
      ok: true,
      closed,
      request: serializeRequest(updated! as Record<string, unknown>),
      ratings,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/assign", requireAuth, async (req, res) => {
  try {
    assertPermission(req.user!, "requests:assign");
    const body = assignRequestSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    const update: Record<string, unknown> = {
      status: "assigned",
      responsibleId: req.user!._id,
      updatedAt: new Date(),
    };
    if (body.contractorId) {
      if (!ObjectId.isValid(body.contractorId)) throw new AppError(400, "Invalid contractor");
      update.contractorId = new ObjectId(body.contractorId);
    }
    if (body.assigneeId) {
      if (!ObjectId.isValid(body.assigneeId)) throw new AppError(400, "Invalid assignee");
      update.assigneeId = new ObjectId(body.assigneeId);
    }
    if (body.dueAt) update.dueAt = new Date(body.dueAt);
    if (body.estimatedCost !== undefined) update.estimatedCost = body.estimatedCost;
    if (body.currency) update.currency = body.currency;
    await collections.serviceRequests.updateOne({ _id: id }, { $set: update });
    await addEvent(req, id, "assigned", { ...body, internalComment: undefined });
    if (body.internalComment) {
      await addEvent(req, id, "internal_comment", { body: body.internalComment });
    }
    const assigneeId = body.assigneeId ? new ObjectId(body.assigneeId) : undefined;
    if (assigneeId) {
      await notifyRequest(req, collections, {
        userId: assigneeId,
        type: "request.assigned",
        title: "Назначено задание",
        body: request.number,
        meta: { requestId: id.toString() },
      });
    }
    const updated = await collections.serviceRequests.findOne({ _id: id });
    res.json({ request: serializeRequest(updated! as Record<string, unknown>) });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/accept", requireAuth, async (req, res) => {
  try {
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    if (!isAssignee(req.user!, request)) throw new AppError(403, "Access denied");
    if (request.status !== "assigned") throw new AppError(400, "Invalid status");
    await req.appLocals.collections.serviceRequests.updateOne(
      { _id: id },
      { $set: { status: "in_progress", updatedAt: new Date() } },
    );
    await addEvent(req, id, "assignment_accepted", {});
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/reject-assignment", requireAuth, async (req, res) => {
  try {
    const body = rejectAssignmentSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    if (!isAssignee(req.user!, request)) throw new AppError(403, "Access denied");
    await collections.serviceRequests.updateOne(
      { _id: id },
      {
        $set: { status: "under_review", updatedAt: new Date() },
        $unset: { assigneeId: true },
      },
    );
    await addEvent(req, id, "assignment_rejected", { reason: body.reason });
    if (request.responsibleId) {
      await notifyRequest(req, collections, {
        userId: request.responsibleId,
        type: "request.rejected",
        title: "Отказ от задания",
        body: `${request.number}: ${body.reason}`,
        meta: { requestId: id.toString() },
      });
    }
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/start", requireAuth, async (req, res) => {
  try {
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    if (!isAssignee(req.user!, request)) throw new AppError(403, "Access denied");
    await req.appLocals.collections.serviceRequests.updateOne(
      { _id: id },
      { $set: { status: "in_progress", updatedAt: new Date() } },
    );
    await addEvent(req, id, "started", {});
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/complete", requireAuth, async (req, res) => {
  try {
    const body = completeRequestSchema.parse(req.body);
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    if (!isAssignee(req.user!, request)) throw new AppError(403, "Access denied");
    const now = new Date();
    const update: Record<string, unknown> = {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    };
    if (body.finalPrice !== undefined) {
      update.finalPrice = body.finalPrice;
    }
    await collections.serviceRequests.updateOne({ _id: id }, { $set: update });
    await addEvent(req, id, "completed", {
      resultDescription: body.resultDescription,
      finalPrice: body.finalPrice,
    });
    const requestIdStr = id.toString();
    const notifyExpiresAt = requestWorkNotificationsExpireAt(now);
    await notifyRequest(req, collections, {
      userId: request.requesterId,
      type: "request.completed",
      title: "Работа выполнена",
      body: `${request.number}: оцените качество работы исполнителя`,
      meta: { requestId: requestIdStr },
      expiresAt: notifyExpiresAt,
    });
    if (request.assigneeId) {
      await notifyRequest(req, collections, {
        userId: request.assigneeId,
        type: "request.rate_customer",
        title: "Оцените заказчика",
        body: `${request.number}: личные качества заказчика`,
        meta: { requestId: requestIdStr },
        expiresAt: notifyExpiresAt,
      });
    }
    await scheduleRequestWorkNotificationsExpiry(collections, requestIdStr, now);
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/close", requireAuth, async (req, res) => {
  try {
    const id = requestObjectId(req);
    const { collections } = req.appLocals;
    const request = await collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    const isRequester = req.user!._id!.equals(request.requesterId);
    const canConfirm = hasPermission(req.user!.roles, "requests:confirm_completion");
    if (!isRequester && !canConfirm) {
      throw new AppError(403, "Access denied");
    }
    const ratingsView = await getRequestRatingsView(collections, request, req.user!);
    if (!ratingsView.bothSubmitted) {
      throw new AppError(400, "Перед закрытием заказчик и исполнитель должны оставить оценки");
    }
    const now = new Date();
    await collections.serviceRequests.updateOne(
      { _id: id },
      { $set: { status: "closed", closedAt: now, completedAt: now, updatedAt: now } },
    );
    await addEvent(req, id, "closed", {});
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/:id/comments", requireAuth, async (req, res) => {
  try {
    const body = commentSchema.parse(req.body);
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);
    if (body.isInternal) {
      assertPermission(req.user!, "requests:change_status");
    }
    await addEvent(req, id, body.isInternal ? "internal_comment" : "comment", {
      body: body.body,
    });
    if (request.status === "new" && !body.isInternal) {
      await req.appLocals.collections.serviceRequests.updateOne(
        { _id: id },
        { $set: { status: "waiting", updatedAt: new Date() } },
      );
    }
    res.status(201).json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/:id/events", requireAuth, async (req, res) => {
  try {
    const id = requestObjectId(req);
    const request = await req.appLocals.collections.serviceRequests.findOne({ _id: id });
    if (!request) throw new AppError(404, "Not found");
    assertCanReadRequest(req.user!, request);
    const events = await req.appLocals.collections.requestEvents
      .find({ requestId: id })
      .sort({ createdAt: 1 })
      .toArray();
    const isStaff = req.user!.roles.some((r) =>
      ["dispatcher", "admin", "manager"].includes(r),
    );
    const filtered = events.filter(
      (e) => isStaff || !["internal_comment"].includes(e.type),
    );
    res.json({
      events: filtered.map((e) => ({
        id: e._id.toString(),
        type: e.type,
        actorId: e.actorId?.toString(),
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
