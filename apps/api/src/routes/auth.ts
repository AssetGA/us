import { Router } from "express";
import { ObjectId } from "mongodb";
import {
  registerSchema,
  registerContractorSchema,
  verifyEmailCodeSchema,
  resendVerificationSchema,
  verificationPresenceSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@service-desk/shared";
import type { Role } from "@service-desk/shared";
import type { UserInsert, EmailVerificationInsert, PasswordResetInsert } from "../db/collections.js";
import { hashPassword, verifyPassword, generateToken, hashToken } from "../lib/password.js";
import { createSession, deleteSession } from "../lib/session.js";
import { AppError, sendError } from "../lib/errors.js";
import { requireAuth, getSessionCookieName, toPublicUser } from "../middleware/context.js";
import { writeAudit } from "../lib/audit.js";
import { sendEmail } from "../lib/mail.js";
import { deliverRegistrationCode } from "../services/registration-delivery.js";
import {
  assertVerificationResendAllowed,
  recordVerificationSitePresence,
  sendVerificationCodeResend,
} from "../services/verification-resend.js";
import {
  applyEmailVerification,
  generateEmailCode,
} from "../services/email-verification.js";
import { isApprovedContractor, isCustomer } from "../services/user-roles.js";

const router = Router();
const CODE_TTL_MS = 15 * 60 * 1000;

async function createEmailVerification(
  collections: Parameters<typeof applyEmailVerification>[0],
  userId: import("mongodb").ObjectId,
) {
  await collections.emailVerifications.updateMany(
    { userId, usedAt: { $exists: false } },
    { $set: { usedAt: new Date() } },
  );
  const code = generateEmailCode();
  const token = generateToken();
  const verification: EmailVerificationInsert = {
    userId,
    tokenHash: hashToken(token),
    codeHash: hashToken(code),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  };
  await collections.emailVerifications.insertOne(verification);
  return { code, token };
}

function buildRoles(body: {
  asCustomer: boolean;
  asContractor: boolean;
}): Role[] {
  const roles: Role[] = [];
  if (body.asCustomer) roles.push("employee");
  if (body.asContractor) roles.push("contractor");
  return roles;
}

async function handleRegister(
  req: import("express").Request,
  res: import("express").Response,
  body: import("@service-desk/shared").RegisterInput,
) {
  const { collections, env } = req.appLocals;
  const existing = await collections.users.findOne({
    email: body.email.toLowerCase(),
  });
  if (existing) {
    throw new AppError(409, "Этот email уже зарегистрирован");
  }
  const now = new Date();
  const passwordHash = await hashPassword(body.password);
  const roles = buildRoles(body);

  let serviceCategoryIds: ObjectId[] | undefined;
  if (body.asContractor && body.serviceCategoryIds?.length) {
    const unique = [...new Set(body.serviceCategoryIds)];
    const invalid = unique.filter((id) => !ObjectId.isValid(id));
    if (invalid.length) {
      throw new AppError(400, "Некорректный вид услуг");
    }
    const oids = unique.map((id) => new ObjectId(id));
    const count = await collections.categories.countDocuments({
      _id: { $in: oids },
      isActive: true,
    });
    if (count !== oids.length) {
      throw new AppError(400, "Выберите услуги только из актуального списка");
    }
    serviceCategoryIds = oids;
  }

  const userDoc: UserInsert = {
    fullName: body.fullName,
    email: body.email.toLowerCase(),
    phone: body.phone,
    city: body.asCustomer ? body.city : undefined,
    organizationName:
      body.asContractor && !body.worksWithoutDocuments ? body.organizationName : undefined,
    worksWithoutDocuments:
      body.asContractor && body.worksWithoutDocuments ? true : undefined,
    serviceCategoryIds,
    servicesDescription: body.asContractor ? body.servicesDescription : undefined,
    passwordHash,
    roles,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };
  const result = await collections.users.insertOne(userDoc);
  const { code, token } = await createEmailVerification(collections, result.insertedId);

  const parts: string[] = [];
  if (body.asCustomer) parts.push("заказчик (подача заявок)");
  if (body.asContractor) parts.push("исполнитель услуг (после одобрения администратором)");
  const deliveryChannel: "email" | "telegram" | "whatsapp" = body.asCustomer
    ? body.verifyChannel === "whatsapp"
      ? "whatsapp"
      : "telegram"
    : "email";

  let delivery;
  try {
    delivery = await deliverRegistrationCode(collections, env, {
      channel: deliveryChannel,
      userId: result.insertedId,
      email: body.email,
      phone: body.phone,
      code,
      token,
      intro: `Регистрация: ${parts.join(" и ")}.`,
    });
  } catch (err) {
    await collections.emailVerifications.deleteMany({ userId: result.insertedId });
    await collections.users.deleteOne({ _id: result.insertedId });
    throw err;
  }

  await collections.users.updateOne(
    { _id: result.insertedId },
    {
      $set: {
        registrationVerifyChannel: delivery.channel,
        verificationCodeSentAt: now,
        updatedAt: now,
      },
    },
  );

  if (body.asContractor) {
    const staff = await collections.users
      .find({ roles: { $in: ["admin", "dispatcher"] }, status: "active" })
      .toArray();
    for (const d of staff) {
      await collections.notifications.insertOne({
        userId: d._id!,
        type: "contractor.registered",
        title: "Заявка исполнителя",
        body: `${body.fullName}${
          body.worksWithoutDocuments
            ? " — без документов"
            : body.organizationName
              ? ` — ${body.organizationName}`
              : ""
        }`,
        meta: { userId: result.insertedId.toString() },
        createdAt: new Date(),
      });
    }
  }

  await writeAudit(collections, {
    userId: result.insertedId,
    action: "auth.register",
    resource: "user",
    resourceId: result.insertedId.toString(),
    ip: req.ip,
    success: true,
    details: { roles },
  });

  res.status(201).json({
    message: delivery.userMessage,
    email: body.email.toLowerCase(),
    verifyChannel: delivery.channel,
    telegramBotUrl: delivery.telegramBotUrl,
    requiresEmailCode: true,
    roles,
  });
}

router.post("/register", async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    await handleRegister(req, res, body);
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/register-contractor", async (req, res) => {
  try {
    const body = registerContractorSchema.parse(req.body);
    await handleRegister(req, res, body);
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/verification-presence", async (req, res) => {
  try {
    const { collections, env } = req.appLocals;
    const body = verificationPresenceSchema.parse(req.body);
    const user = await collections.users.findOne({
      email: body.email.toLowerCase(),
    });
    if (!user) {
      throw new AppError(400, "Пользователь не найден");
    }
    if (user.emailVerifiedAt) {
      res.json({ codeResent: false, message: "Аккаунт уже подтверждён." });
      return;
    }
    const result = await recordVerificationSitePresence(
      collections,
      env,
      user,
      (userId) => createEmailVerification(collections, userId),
    );
    res.json(result);
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const { collections, env } = req.appLocals;
    const body = resendVerificationSchema.parse(req.body);
    const user = await collections.users.findOne({
      email: body.email.toLowerCase(),
    });
    if (!user) {
      throw new AppError(400, "Пользователь не найден");
    }
    if (user.emailVerifiedAt) {
      throw new AppError(400, "Аккаунт уже подтверждён");
    }
    assertVerificationResendAllowed(user);
    const delivery = await sendVerificationCodeResend(
      collections,
      env,
      user,
      (userId) => createEmailVerification(collections, userId),
      body.channel,
      "Повторная отправка кода подтверждения.",
    );
    res.json({
      message: delivery.userMessage,
      verifyChannel: delivery.channel,
      telegramBotUrl: delivery.telegramBotUrl,
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/verify-email-code", async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const body = verifyEmailCodeSchema.parse(req.body);
    const user = await collections.users.findOne({
      email: body.email.toLowerCase(),
    });
    if (!user) {
      throw new AppError(400, "Неверный email или код");
    }
    const record = await collections.emailVerifications.findOne({
      userId: user._id,
      codeHash: hashToken(body.code),
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    if (!record) {
      throw new AppError(400, "Неверный email или код");
    }
    const result = await applyEmailVerification(
      collections,
      user._id!,
      record._id!,
    );
    res.json(result);
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/login", async (req, res) => {
  try {
    const { collections, env } = req.appLocals;
    const body = loginSchema.parse(req.body);
    const user = await collections.users.findOne({ email: body.email.toLowerCase() });
    const fail = async () => {
      await writeAudit(collections, {
        action: "auth.login_failed",
        resource: "user",
        ip: req.ip,
        success: false,
        details: { email: body.email },
      });
      throw new AppError(401, "Неверный email или пароль");
    };
    if (!user) await fail();
    const ok = await verifyPassword(user!.passwordHash, body.password);
    if (!ok) await fail();
    if (user!.status === "blocked") {
      throw new AppError(403, "Аккаунт заблокирован");
    }
    if (!user!.emailVerifiedAt) {
      throw new AppError(
        403,
        "Подтвердите регистрацию: введите код с email или Telegram",
      );
    }
    if (user!.status !== "active") {
      throw new AppError(
        403,
        "Доступ ещё не открыт. Дождитесь одобрения администратором (для исполнителя без роли заказчика).",
      );
    }
    const sessionId = await createSession(collections, user!._id!, {
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
    res.cookie(getSessionCookieName(), sessionId, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    await writeAudit(collections, {
      userId: user!._id,
      action: "auth.login",
      resource: "user",
      resourceId: user!._id!.toString(),
      ip: req.ip,
      success: true,
    });
    res.json({
      user: toPublicUser(user!),
      contractorApproved: isApprovedContractor(user!),
      isCustomer: isCustomer(user!),
    });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/logout", requireAuth, async (req, res) => {
  try {
    if (req.sessionId) {
      await deleteSession(req.appLocals.collections, req.sessionId);
    }
    res.clearCookie(getSessionCookieName());
    res.json({ ok: true });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { collections, env } = req.appLocals;
    const body = forgotPasswordSchema.parse(req.body);
    const user = await collections.users.findOne({ email: body.email.toLowerCase() });
    res.json({
      message:
        "Если email зарегистрирован, на него отправлена ссылка для сброса пароля.",
    });
    if (!user) return;
    const token = generateToken();
    const resetDoc: PasswordResetInsert = {
      userId: user._id!,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
    await collections.passwordResets.insertOne(resetDoc);
    await sendEmail(
      env,
      user.email,
      "Восстановление пароля",
      `Ссылка для сброса: ${env.WEB_ORIGIN}/reset-password?token=${token}`,
    );
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const body = resetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(body.token);
    const record = await collections.passwordResets.findOne({
      tokenHash,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw new AppError(400, "Ссылка недействительна или истекла");
    const passwordHash = await hashPassword(body.password);
    await collections.users.updateOne(
      { _id: record.userId },
      { $set: { passwordHash, updatedAt: new Date() } },
    );
    await collections.passwordResets.updateOne(
      { _id: record._id },
      { $set: { usedAt: new Date() } },
    );
    res.json({ message: "Password updated" });
  } catch (e) {
    sendError(res, e);
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const { collections } = req.appLocals;
    const token = String(req.body.token ?? "");
    if (!token) throw new AppError(400, "Не указан token");
    const record = await collections.emailVerifications.findOne({
      tokenHash: hashToken(token),
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    });
    if (!record) throw new AppError(400, "Ссылка недействительна или истекла");
    const result = await applyEmailVerification(
      collections,
      record.userId,
      record._id!,
    );
    res.json(result);
  } catch (e) {
    sendError(res, e);
  }
});

export default router;
