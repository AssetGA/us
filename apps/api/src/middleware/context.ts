import type { Request, Response, NextFunction } from "express";
import type { DbCollections, UserDoc } from "../db/collections.js";
import type { Env } from "../config.js";
import { getSessionUserId } from "../lib/session.js";
import { AppError } from "../lib/errors.js";
import { isGuaranteedSpecialist } from "../services/user-roles.js";

export type AppLocals = {
  env: Env;
  collections: DbCollections;
};

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
      sessionId?: string;
      appLocals: AppLocals;
    }
  }
}

const SESSION_COOKIE = "sd_session";

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export async function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) {
      next();
      return;
    }
    const userId = await getSessionUserId(req.appLocals.collections, sessionId);
    if (!userId) {
      next();
      return;
    }
    const user = await req.appLocals.collections.users.findOne({ _id: userId });
    if (user && user.status === "active") {
      req.user = user;
      req.sessionId = sessionId;
    }
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError(401, "Authentication required"));
    return;
  }
  next();
}

export function toPublicUser(user: UserDoc) {
  return {
    id: user._id!.toString(),
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    department: user.department,
    position: user.position,
    city: user.city,
    organizationName: user.organizationName,
    worksWithoutDocuments: Boolean(user.worksWithoutDocuments),
    servicesDescription: user.servicesDescription,
    serviceCategoryIds: user.serviceCategoryIds?.map((id) => id.toString()) ?? [],
    roles: user.roles,
    status: user.status,
    contractorId: user.contractorId?.toString(),
    telegramLinked: Boolean(user.telegramId),
    emailVerifiedAt: user.emailVerifiedAt,
    contractorApprovedAt: user.contractorApprovedAt,
    guaranteedSpecialist: isGuaranteedSpecialist(user),
    isSuperAdmin: Boolean(user.isSuperAdmin),
    ratingAsContractor: user.ratingAsContractor,
    ratingAsCustomer: user.ratingAsCustomer,
    createdAt: user.createdAt,
  };
}
