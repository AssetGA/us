import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  becomeContractorSchema,
  updateAvatarSchema,
  updateContractorProfileSchema,
} from "@service-desk/shared";
import { requireAuth, toPublicUser } from "../middleware/context.js";
import { AppError, sendError } from "../lib/errors.js";
import { saveUserAvatar } from "../lib/avatar.js";
import { writeAudit } from "../lib/audit.js";
import { applyBecomeContractor, applyBecomeCustomer } from "../services/become-roles.js";
import { isTelegramRequiredForWorkNotifications } from "../services/telegram-notifications.js";
const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const botConfigured = isTelegramRequiredForWorkNotifications(req.appLocals.env);
    res.json({
      user: toPublicUser(req.user!),
      telegramNotifications: {
        botConfigured,
        linkRequired: botConfigured,
      },
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.patch("/me", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    if (!user.roles.includes("contractor")) {
      throw new AppError(403, "Редактирование доступно исполнителям");
    }
    const body = updateContractorProfileSchema.parse(req.body);
    const { collections } = req.appLocals;
    const update: Record<string, unknown> = { updatedAt: new Date() };
    const unset: Record<string, ""> = {};

    if (body.fullName !== undefined) update.fullName = body.fullName;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.city !== undefined) update.city = body.city;
    if (body.worksWithoutDocuments === true) {
      update.worksWithoutDocuments = true;
      unset.organizationName = "";
    } else if (body.worksWithoutDocuments === false) {
      update.worksWithoutDocuments = false;
    }
    if (body.organizationName) {
      update.organizationName = body.organizationName;
      update.worksWithoutDocuments = false;
    }
    if (body.servicesDescription !== undefined) {
      update.servicesDescription = body.servicesDescription;
    }
    if (body.serviceCategoryIds !== undefined) {
      const unique = [...new Set(body.serviceCategoryIds)];
      for (const id of unique) {
        if (!ObjectId.isValid(id)) throw new AppError(400, "Некорректная категория");
      }
      const cats = await collections.categories
        .find({ _id: { $in: unique.map((id) => new ObjectId(id)) }, isActive: true })
        .toArray();
      if (cats.length !== unique.length) {
        throw new AppError(400, "Одна или несколько категорий не найдены");
      }
      update.serviceCategoryIds = unique.map((id) => new ObjectId(id));
    }

    await collections.users.updateOne(
      { _id: user._id! },
      {
        $set: update,
        ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
      },
    );
    const updated = await collections.users.findOne({ _id: user._id! });
    res.json({ user: toPublicUser(updated!) });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/me/become-contractor", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    if (!user.roles.includes("employee")) {
      throw new AppError(403, "Доступно заказчикам с подтверждённым аккаунтом");
    }
    const body = becomeContractorSchema.parse(req.body);
    const { collections } = req.appLocals;
    const updated = await applyBecomeContractor(collections, user, body);
    await writeAudit(collections, {
      userId: user._id,
      action: "user.become_contractor",
      resource: "user",
      resourceId: user._id!.toString(),
      ip: req.ip,
      success: true,
    });
    res.json({
      user: toPublicUser(updated!),
      message:
        "Данные исполнителя сохранены. Режим исполнителя откроется после одобрения администратором.",
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/me/become-customer", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    const { collections } = req.appLocals;
    const updated = await applyBecomeCustomer(collections, user);
    await writeAudit(collections, {
      userId: user._id,
      action: "user.become_customer",
      resource: "user",
      resourceId: user._id!.toString(),
      ip: req.ip,
      success: true,
    });
    res.json({
      user: toPublicUser(updated!),
      message:
        "Режим заказчика включён. Используются те же ФИО, email и телефон, что в профиле исполнителя.",
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/me/avatar", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    if (!user.roles.includes("contractor")) {
      throw new AppError(403, "Фото доступно исполнителям");
    }
    const body = updateAvatarSchema.parse(req.body);
    const avatarUrl = await saveUserAvatar(
      user._id!.toString(),
      body.contentType,
      body.imageBase64,
    );
    const versioned = `${avatarUrl}?v=${Date.now()}`;
    await req.appLocals.collections.users.updateOne(
      { _id: user._id! },
      { $set: { avatarUrl: versioned, updatedAt: new Date() } },
    );
    const updated = await req.appLocals.collections.users.findOne({ _id: user._id! });
    res.json({ user: toPublicUser(updated!), avatarUrl: versioned });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
