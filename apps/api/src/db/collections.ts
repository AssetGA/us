import type { Collection, Db, Document, ObjectId, OptionalId } from "mongodb";
import type { Role, RequestStatus, UserStatus } from "@service-desk/shared";

export type UserDoc = {
  _id?: ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  position?: string;
  city?: string;
  organizationName?: string;
  /** Исполнитель работает без ИП / организации — строка в портфолио для заказчиков */
  worksWithoutDocuments?: boolean;
  serviceCategoryIds?: ObjectId[];
  passwordHash: string;
  roles: Role[];
  status: UserStatus;
  telegramId?: number;
  contractorId?: ObjectId;
  emailVerifiedAt?: Date;
  contractorApprovedAt?: Date;
  /** Значок «ГС» (гарантированный специалист) — только администратор, для одобренного исполнителя */
  guaranteedSpecialistAt?: Date;
  servicesDescription?: string;
  /** Главный администратор: может создавать других админов */
  isSuperAdmin?: boolean;
  /** Средняя оценка как исполнитель (качество работ) */
  ratingAsContractor?: { avg: number; count: number };
  /** Средняя оценка как заказчик (личные качества) */
  ratingAsCustomer?: { avg: number; count: number };
  /** Последний визит на страницу подтверждения регистрации (для правила 4 ч) */
  verificationSiteLastSeenAt?: Date;
  /** Когда последний раз отправляли код подтверждения */
  verificationCodeSentAt?: Date;
  /** Канал доставки кода при регистрации / повторной отправке */
  registrationVerifyChannel?: "email" | "telegram" | "whatsapp";
  createdAt: Date;
  updatedAt: Date;
};

export type ContractorDoc = {
  _id?: ObjectId;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  allowedCategoryIds: ObjectId[];
  isActive: boolean;
  createdAt: Date;
};

export type CategoryDoc = {
  _id?: ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
};

export type ServiceRequestDoc = {
  _id?: ObjectId;
  number: string;
  title: string;
  description: string;
  categoryId: ObjectId;
  requesterId: ObjectId;
  contractorId?: ObjectId;
  assigneeId?: ObjectId;
  responsibleId?: ObjectId;
  location: {
    site: string;
    address?: string;
    floor?: string;
    room?: string;
  };
  priority: "low" | "normal" | "high" | "urgent";
  status: RequestStatus;
  dueAt?: Date;
  /** Срок приёма откликов исполнителей */
  validUntil?: Date;
  /** Согласованное время выполнения (из выбранного отклика) */
  scheduledStart?: Date;
  scheduledEnd?: Date;
  proposedPrice?: number;
  estimatedCost?: number;
  finalPrice?: number;
  currency?: string;
  completedAt?: Date;
  closedAt?: Date;
  equipment?: string;
  inventoryNumber?: string;
  contactPerson?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type RequestOfferStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export type RequestOfferDoc = {
  _id?: ObjectId;
  requestId: ObjectId;
  contractorUserId: ObjectId;
  message?: string;
  availableFrom: Date;
  availableUntil: Date;
  proposedPrice?: number;
  currency?: string;
  status: RequestOfferStatus;
  createdAt: Date;
};

export type RequestRatingKind = "work" | "customer_conduct";

export type RequestRatingDoc = {
  _id?: ObjectId;
  requestId: ObjectId;
  fromUserId: ObjectId;
  toUserId: ObjectId;
  kind: RequestRatingKind;
  score: number;
  comment?: string;
  createdAt: Date;
};

export type RequestEventDoc = {
  _id?: ObjectId;
  requestId: ObjectId;
  type: string;
  actorId?: ObjectId;
  payload: Document;
  createdAt: Date;
};

export type SessionDoc = {
  _id: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
  ip?: string;
  userAgent?: string;
};

export type PasswordResetDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
};

export type EmailVerificationDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  codeHash?: string;
  expiresAt: Date;
  usedAt?: Date;
};

export type TelegramLinkDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  code: string;
  expiresAt: Date;
  telegramId?: number;
  linkedAt?: Date;
};

/** Выдача кода регистрации через бота (fallback WhatsApp) */
export type TelegramRegistrationHandoffDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  startToken: string;
  code: string;
  expiresAt: Date;
  telegramId?: number;
  deliveredAt?: Date;
};

export type NotificationDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  type: string;
  title: string;
  body: string;
  readAt?: Date;
  meta?: Document;
  createdAt: Date;
  /** После выполнения работ — автоудаление через 7 дней (TTL) */
  expiresAt?: Date;
};

export type AuditLogDoc = {
  _id?: ObjectId;
  userId?: ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  ip?: string;
  success: boolean;
  details?: Document;
  createdAt: Date;
};

export type UserInsert = OptionalId<UserDoc>;
export type ServiceRequestInsert = OptionalId<ServiceRequestDoc>;
export type RequestEventInsert = OptionalId<RequestEventDoc>;
export type RequestRatingInsert = OptionalId<RequestRatingDoc>;
export type RequestOfferInsert = OptionalId<RequestOfferDoc>;
export type NotificationInsert = OptionalId<NotificationDoc>;
export type AuditLogInsert = OptionalId<AuditLogDoc>;
export type CategoryInsert = OptionalId<CategoryDoc>;
export type ContractorInsert = OptionalId<ContractorDoc>;
export type TelegramLinkInsert = OptionalId<TelegramLinkDoc>;
export type TelegramRegistrationHandoffInsert = OptionalId<TelegramRegistrationHandoffDoc>;
export type EmailVerificationInsert = OptionalId<EmailVerificationDoc>;
export type PasswordResetInsert = OptionalId<PasswordResetDoc>;

export type DbCollections = {
  users: Collection<UserDoc>;
  contractors: Collection<ContractorDoc>;
  categories: Collection<CategoryDoc>;
  serviceRequests: Collection<ServiceRequestDoc>;
  requestRatings: Collection<RequestRatingDoc>;
  requestOffers: Collection<RequestOfferDoc>;
  requestEvents: Collection<RequestEventDoc>;
  sessions: Collection<SessionDoc>;
  passwordResets: Collection<PasswordResetDoc>;
  emailVerifications: Collection<EmailVerificationDoc>;
  telegramLinks: Collection<TelegramLinkDoc>;
  telegramRegistrationHandoffs: Collection<TelegramRegistrationHandoffDoc>;
  notifications: Collection<NotificationDoc>;
  auditLogs: Collection<AuditLogDoc>;
};

export async function getCollections(db: Db): Promise<DbCollections> {
  return {
    users: db.collection<UserDoc>("users"),
    contractors: db.collection<ContractorDoc>("contractors"),
    categories: db.collection<CategoryDoc>("categories"),
    serviceRequests: db.collection<ServiceRequestDoc>("serviceRequests"),
    requestRatings: db.collection<RequestRatingDoc>("requestRatings"),
    requestOffers: db.collection<RequestOfferDoc>("requestOffers"),
    requestEvents: db.collection<RequestEventDoc>("requestEvents"),
    sessions: db.collection<SessionDoc>("sessions"),
    passwordResets: db.collection<PasswordResetDoc>("passwordResets"),
    emailVerifications: db.collection<EmailVerificationDoc>("emailVerifications"),
    telegramLinks: db.collection<TelegramLinkDoc>("telegramLinks"),
    telegramRegistrationHandoffs: db.collection<TelegramRegistrationHandoffDoc>(
      "telegramRegistrationHandoffs",
    ),
    notifications: db.collection<NotificationDoc>("notifications"),
    auditLogs: db.collection<AuditLogDoc>("auditLogs"),
  };
}

export async function ensureIndexes(collections: DbCollections): Promise<void> {
  await collections.users.createIndex({ email: 1 }, { unique: true });
  await collections.serviceRequests.createIndex({ number: 1 }, { unique: true });
  await collections.serviceRequests.createIndex({ status: 1, createdAt: -1 });
  await collections.serviceRequests.createIndex({ requesterId: 1, createdAt: -1 });
  await collections.serviceRequests.createIndex({ assigneeId: 1 });
  await collections.serviceRequests.createIndex({ contractorId: 1 });
  await collections.requestEvents.createIndex({ requestId: 1, createdAt: -1 });
  await collections.requestRatings.createIndex({ requestId: 1, kind: 1 }, { unique: true });
  await collections.requestOffers.createIndex({ requestId: 1, contractorUserId: 1 }, { unique: true });
  await collections.requestOffers.createIndex({ requestId: 1, status: 1 });
  await collections.serviceRequests.createIndex({ status: 1, validUntil: 1 });
  await collections.requestRatings.createIndex({ toUserId: 1, kind: 1 });
  await collections.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await collections.telegramLinks.createIndex({ code: 1 }, { unique: true });
  await collections.telegramRegistrationHandoffs.createIndex(
    { startToken: 1 },
    { unique: true },
  );
  await collections.telegramRegistrationHandoffs.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await collections.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
