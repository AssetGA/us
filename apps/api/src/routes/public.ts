import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requestListQuerySchema } from "@service-desk/shared";
import { sendError } from "../lib/errors.js";
import { buildContractorPortfolioText } from "@service-desk/shared";
import { applyRequestListQuery } from "../services/request-filters.js";
import { isGuaranteedSpecialist } from "../services/user-roles.js";
import {
  formatTelegramBotDisplayName,
  buildTelegramBotProfileUrl,
  isTelegramBotConfigured,
} from "../lib/telegram.js";

const contractorListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const router = Router();

router.get("/categories", async (req, res) => {
  try {
    const items = await req.appLocals.collections.categories
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    res.json({
      items: items.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
      })),
    });
  } catch (e) {
    sendError(res, e);
  }
});

function buildPublicContractorFilter(query: z.infer<typeof contractorListQuerySchema>) {
  const filter: Record<string, unknown> = {
    roles: "contractor",
    status: "active",
    contractorApprovedAt: { $exists: true },
  };

  if (query.city?.trim()) {
    const escaped = query.city.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.city = { $regex: escaped, $options: "i" };
  }

  if (query.categoryId && ObjectId.isValid(query.categoryId)) {
    filter.serviceCategoryIds = new ObjectId(query.categoryId);
  }

  if (query.q?.trim()) {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$or = [
      { fullName: regex },
      { organizationName: regex },
      { servicesDescription: regex },
    ];
  }

  return filter;
}

/** Одобренные исполнители — только публичные поля */
router.get("/contractors", async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const query = contractorListQuerySchema.parse(req.query);
    const filter = buildPublicContractorFilter(query);
    const skip = (query.page - 1) * query.limit;

    const [users, total] = await Promise.all([
      collections.users
        .find(filter)
        .sort({ organizationName: 1, fullName: 1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collections.users.countDocuments(filter),
    ]);

    const categoryIds = users.flatMap((u) => u.serviceCategoryIds ?? []);
    const categories =
      categoryIds.length > 0
        ? await collections.categories.find({ _id: { $in: categoryIds } }).toArray()
        : [];
    const catName = new Map(categories.map((c) => [c._id!.toString(), c.name]));

    res.json({
      items: users.map((u) => ({
        id: u._id!.toString(),
        displayName: u.organizationName ?? u.fullName,
        city: u.city,
        worksWithoutDocuments: Boolean(u.worksWithoutDocuments),
        portfolio: buildContractorPortfolioText(u),
        servicesDescription: u.servicesDescription,
        serviceNames: (u.serviceCategoryIds ?? []).map((id) => catName.get(id.toString()) ?? id.toString()),
        ratingAsContractor: u.ratingAsContractor,
        avatarUrl: u.avatarUrl,
        guaranteedSpecialist: isGuaranteedSpecialist(u),
      })),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

/** Публичный каталог заявок — без персональных данных и адреса */
router.get("/requests", async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const query = requestListQuerySchema.parse(req.query);
    const filter = applyRequestListQuery({}, query);
    const skip = (query.page - 1) * query.limit;
    const [rows, total] = await Promise.all([
      collections.serviceRequests
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      collections.serviceRequests.countDocuments(filter),
    ]);

    const categoryIds = [...new Set(rows.map((r) => r.categoryId.toString()))];
    const categories =
      categoryIds.length > 0
        ? await collections.categories
            .find({ _id: { $in: rows.map((r) => r.categoryId) } })
            .toArray()
        : [];
    const catName = new Map(categories.map((c) => [c._id!.toString(), c.name]));

    res.json({
      items: rows.map((r) => ({
        id: r._id!.toString(),
        number: r.number,
        title: r.title,
        status: r.status,
        priority: r.priority,
        categoryName: catName.get(r.categoryId.toString()) ?? "",
        createdAt: r.createdAt,
        proposedPrice: r.proposedPrice,
        estimatedCost: r.estimatedCost,
        finalPrice: r.finalPrice,
        currency: r.currency,
        site: r.location?.site,
        validUntil: r.validUntil,
      })),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.get("/telegram-bot", (_req, res) => {
  const env = _req.appLocals.env;
  if (!isTelegramBotConfigured(env)) {
    res.json({ configured: false });
    return;
  }
  const botUsername = formatTelegramBotDisplayName(env.TELEGRAM_BOT_USERNAME!);
  res.json({
    configured: true,
    botUsername,
    botUrl: buildTelegramBotProfileUrl(env.TELEGRAM_BOT_USERNAME!),
  });
});

export default router;
