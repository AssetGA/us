import { Router, type Request } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { requireAuth } from "../middleware/context.js";
import { assertPermission } from "../services/request-access.js";
import { paramId } from "../lib/params.js";
import type { UserInsert, CategoryInsert, ContractorInsert } from "../db/collections.js";
import { AppError, sendError } from "../lib/errors.js";
import { toPublicUser } from "../middleware/context.js";
import { hashPassword, generateToken, hashToken } from "../lib/password.js";
import { sendEmail } from "../lib/mail.js";
import { createAdminSchema, type Role } from "@service-desk/shared";
import { writeAudit } from "../lib/audit.js";
import { deleteAllUserSessions } from "../lib/session.js";

const router = Router();

function requireAdmin(req: Request) {
  assertPermission(req.user!, "users:manage");
}

function requireSuperAdmin(req: Request) {
  requireAdmin(req);
  if (!req.user!.isSuperAdmin) {
    throw new AppError(403, "Только главный администратор может выполнить это действие");
  }
}

router.get("/admins", requireAuth, async (req, res) => {
  try {
    requireSuperAdmin(req);
    const items = await req.appLocals.collections.users
      .find({ roles: "admin" })
      .sort({ createdAt: 1 })
      .toArray();
    res.json({ items: items.map((u) => toPublicUser(u)) });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/admins", requireAuth, async (req, res) => {
  try {
    requireSuperAdmin(req);
    const body = createAdminSchema.parse(req.body);
    const email = body.email.toLowerCase();
    const existing = await req.appLocals.collections.users.findOne({ email });
    if (existing) {
      throw new AppError(409, "Пользователь с таким email уже существует");
    }
    const tempPassword = body.password ?? generateToken().slice(0, 12);
    const now = new Date();
    const roles: Role[] = ["admin"];
    if (body.asDispatcher) roles.push("dispatcher");
    const userDoc: UserInsert = {
      fullName: body.fullName.trim(),
      email,
      passwordHash: await hashPassword(tempPassword),
      roles,
      status: "active",
      emailVerifiedAt: now,
      isSuperAdmin: false,
      createdAt: now,
      updatedAt: now,
    };
    const result = await req.appLocals.collections.users.insertOne(userDoc);
    await sendEmail(
      req.appLocals.env,
      email,
      "Доступ администратора Service Desk",
      `Вам создан аккаунт администратора.

Email: ${email}
Пароль: ${body.password ? "(указан при создании)" : tempPassword}

Вход: ${req.appLocals.env.WEB_ORIGIN}/login

Вы можете одобрять исполнителей и управлять пользователями в разделе «Пользователи».`,
    );
    await writeAudit(req.appLocals.collections, {
      userId: req.user!._id,
      action: "admin.create",
      resource: "user",
      resourceId: result.insertedId.toString(),
      ip: req.ip,
      success: true,
      details: { email, roles },
    });
    const created = await req.appLocals.collections.users.findOne({ _id: result.insertedId });
    res.status(201).json({
      user: toPublicUser(created!),
      temporaryPassword: body.password ? undefined : tempPassword,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.delete("/admins/:id", requireAuth, async (req, res) => {
  try {
    requireSuperAdmin(req);
    const pid = paramId(req.params.id);
    if (!ObjectId.isValid(pid)) throw new AppError(400, "Invalid id");
    const id = new ObjectId(pid);
    if (req.user!._id!.equals(id)) {
      throw new AppError(400, "Нельзя снять права с самого себя");
    }
    const target = await req.appLocals.collections.users.findOne({ _id: id });
    if (!target) throw new AppError(404, "Not found");
    if (target.isSuperAdmin) {
      throw new AppError(403, "Нельзя снять права главного администратора");
    }
    if (!target.roles.includes("admin")) {
      throw new AppError(400, "Пользователь не является администратором");
    }
    const roles = target.roles.filter((r) => r !== "admin" && r !== "dispatcher") as Role[];
    if (roles.length === 0) roles.push("employee");
    await req.appLocals.collections.users.updateOne(
      { _id: id },
      { $set: { roles, updatedAt: new Date() } },
    );
    await writeAudit(req.appLocals.collections, {
      userId: req.user!._id,
      action: "admin.revoke",
      resource: "user",
      resourceId: id.toString(),
      ip: req.ip,
      success: true,
    });
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

const adminUsersListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  /** Одобренные исполнители (для управления значком ГС) */
  contractorApproved: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  q: z.string().max(200).optional(),
});

router.get("/users", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const query = adminUsersListQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const filter: Record<string, unknown> = {};
    if (query.contractorApproved) {
      filter.roles = "contractor";
      filter.contractorApprovedAt = { $exists: true };
    }
    if (query.q?.trim()) {
      const re = { $regex: query.q.trim(), $options: "i" };
      filter.$or = [{ fullName: re }, { email: re }, { organizationName: re }];
    }

    const [items, total] = await Promise.all([
      req.appLocals.collections.users
        .find(filter)
        .sort({ organizationName: 1, fullName: 1, createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .toArray(),
      req.appLocals.collections.users.countDocuments(filter),
    ]);
    res.json({
      items: items.map(toPublicUser),
      page: query.page,
      limit: query.limit,
      total,
    });
  } catch (e) {
    sendError(res, e);
  }
});

const statusSchema = z.object({
  status: z.enum(["pending", "active", "blocked"]),
});

router.patch("/users/:id/status", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const pid = paramId(req.params.id);
    if (!ObjectId.isValid(pid)) throw new AppError(400, "Invalid id");
    const body = statusSchema.parse(req.body);
    const id = new ObjectId(pid);
    const actor = req.user!;

    if (actor._id!.equals(id)) {
      throw new AppError(400, "Нельзя изменить статус своего аккаунта");
    }

    const existing = await req.appLocals.collections.users.findOne({ _id: id });
    if (!existing) throw new AppError(404, "Not found");

    if (existing.isSuperAdmin) {
      throw new AppError(403, "Нельзя заблокировать главного администратора");
    }

    const targetIsAdmin = existing.roles.includes("admin");
    if (targetIsAdmin && !actor.isSuperAdmin) {
      throw new AppError(403, "Блокировка администраторов доступна только главному администратору");
    }

    const now = new Date();
    const update: Record<string, unknown> = {
      status: body.status,
      updatedAt: now,
    };
    if (
      body.status === "active" &&
      existing.roles.includes("contractor") &&
      !existing.contractorApprovedAt
    ) {
      update.contractorApprovedAt = now;
    }

    if (body.status === "blocked") {
      await req.appLocals.collections.users.updateOne(
        { _id: id },
        { $set: update, $unset: { guaranteedSpecialistAt: "" } },
      );
      await deleteAllUserSessions(req.appLocals.collections, id);
    } else {
      await req.appLocals.collections.users.updateOne({ _id: id }, { $set: update });
    }

    await writeAudit(req.appLocals.collections, {
      userId: actor._id,
      action: body.status === "blocked" ? "user.blocked" : "user.status_changed",
      resource: "user",
      resourceId: id.toString(),
      ip: req.ip,
      success: true,
      details: { status: body.status, targetEmail: existing.email },
    });

    const user = await req.appLocals.collections.users.findOne({ _id: id });
    res.json({ user: toPublicUser(user!) });
  } catch (e) {
    sendError(res, e);
  }
});

const inviteContractorSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2),
  contractorId: z.string(),
  phone: z.string().optional(),
});

const guaranteedSpecialistSchema = z.object({
  enabled: z.boolean(),
});

router.patch("/users/:id/guaranteed-specialist", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const pid = paramId(req.params.id);
    if (!ObjectId.isValid(pid)) throw new AppError(400, "Invalid id");
    const body = guaranteedSpecialistSchema.parse(req.body);
    const id = new ObjectId(pid);
    const actor = req.user!;

    const existing = await req.appLocals.collections.users.findOne({ _id: id });
    if (!existing) throw new AppError(404, "Not found");
    if (!existing.roles.includes("contractor")) {
      throw new AppError(400, "Значок ГС доступен только исполнителям");
    }
    if (!existing.contractorApprovedAt) {
      throw new AppError(400, "Сначала одобрите исполнителя");
    }
    if (existing.status === "blocked") {
      throw new AppError(400, "Нельзя изменить значок у заблокированного пользователя");
    }

    const now = new Date();
    if (body.enabled) {
      await req.appLocals.collections.users.updateOne(
        { _id: id },
        { $set: { guaranteedSpecialistAt: now, updatedAt: now } },
      );
    } else {
      await req.appLocals.collections.users.updateOne(
        { _id: id },
        { $unset: { guaranteedSpecialistAt: "" }, $set: { updatedAt: now } },
      );
    }

    await writeAudit(req.appLocals.collections, {
      userId: actor._id,
      action: body.enabled ? "user.guaranteed_specialist.granted" : "user.guaranteed_specialist.revoked",
      resource: "user",
      resourceId: id.toString(),
      ip: req.ip,
      success: true,
      details: { targetEmail: existing.email, enabled: body.enabled },
    });

    const user = await req.appLocals.collections.users.findOne({ _id: id });
    res.json({ user: toPublicUser(user!) });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/contractors/invite", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const body = inviteContractorSchema.parse(req.body);
    if (!ObjectId.isValid(body.contractorId)) throw new AppError(400, "Invalid contractor");
    const contractor = await req.appLocals.collections.contractors.findOne({
      _id: new ObjectId(body.contractorId),
    });
    if (!contractor) throw new AppError(404, "Contractor not found");
    const existing = await req.appLocals.collections.users.findOne({
      email: body.email.toLowerCase(),
    });
    if (existing) throw new AppError(409, "Email already registered");
    const tempPassword = generateToken().slice(0, 12);
    const now = new Date();
    const userDoc: UserInsert = {
      fullName: body.fullName,
      email: body.email.toLowerCase(),
      phone: body.phone,
      passwordHash: await hashPassword(tempPassword),
      roles: ["contractor"] as Role[],
      status: "pending",
      contractorId: contractor._id,
      createdAt: now,
      updatedAt: now,
    };
    const result = await req.appLocals.collections.users.insertOne(userDoc);
    await sendEmail(
      req.appLocals.env,
      body.email,
      "Приглашение в систему заявок",
      `Вам создан аккаунт подрядчика. Временный пароль: ${tempPassword}\nВойдите: ${req.appLocals.env.WEB_ORIGIN}/login`,
    );
    res.status(201).json({ userId: result.insertedId.toString() });
  } catch (e) {
    sendError(res, e);
  }
});

const categorySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100),
  sortOrder: z.number().int().default(0),
});

router.post("/categories", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const body = categorySchema.parse(req.body);
    const cat: CategoryInsert = {
      name: body.name,
      slug: body.slug,
      sortOrder: body.sortOrder,
      isActive: true,
    };
    const result = await req.appLocals.collections.categories.insertOne(cat);
    res.status(201).json({ id: result.insertedId.toString() });
  } catch (e) {
    sendError(res, e);
  }
});

const contractorSchema = z.object({
  name: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  allowedCategoryIds: z.array(z.string()).default([]),
});

router.post("/contractors", requireAuth, async (req, res) => {
  try {
    requireAdmin(req);
    const body = contractorSchema.parse(req.body);
    const contractorDoc: ContractorInsert = {
      name: body.name,
      contactEmail: body.contactEmail.toLowerCase(),
      contactPhone: body.contactPhone,
      allowedCategoryIds: body.allowedCategoryIds
        .filter(ObjectId.isValid)
        .map((id) => new ObjectId(id)),
      isActive: true,
      createdAt: new Date(),
    };
    const result = await req.appLocals.collections.contractors.insertOne(contractorDoc);
    res.status(201).json({ id: result.insertedId.toString() });
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
