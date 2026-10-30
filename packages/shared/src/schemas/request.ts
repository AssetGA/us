import { z } from "zod";

export const REQUEST_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const REQUEST_STATUSES = [
  "new",
  "under_review",
  "assigned",
  "in_progress",
  "waiting",
  "completed",
  "closed",
  "rejected",
] as const;

export const DEFAULT_CURRENCY = "KZT";

export const locationSchema = z.object({
  site: z.string().min(1).max(200),
  address: z.string().max(500).optional(),
  floor: z.string().max(50).optional(),
  room: z.string().max(100).optional(),
});

export const createRequestSchema = z.object({
  title: z.string().min(3).max(300),
  description: z.string().min(10).max(10000),
  categoryId: z.string().min(1),
  location: locationSchema,
  priority: z.enum(REQUEST_PRIORITIES).default("normal"),
  dueAt: z.string().datetime().optional(),
  equipment: z.string().max(500).optional(),
  inventoryNumber: z.string().max(100).optional(),
  contactPerson: z.string().max(200).optional(),
  proposedPrice: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).default(DEFAULT_CURRENCY),
  /** До какого момента заявка принимает отклики исполнителей */
  validUntil: z.string().datetime({ message: "Укажите срок действия заявки" }),
});

export const submitRequestOfferSchema = z
  .object({
    message: z.string().max(2000).optional(),
    availableFrom: z.string().datetime({ message: "Укажите начало выполнения" }),
    availableUntil: z.string().datetime({ message: "Укажите окончание выполнения" }),
    proposedPrice: z.coerce.number().min(0).optional(),
    currency: z.string().length(3).optional(),
  })
  .superRefine((data, ctx) => {
    const from = new Date(data.availableFrom);
    const until = new Date(data.availableUntil);
    if (until <= from) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Окончание должно быть позже начала",
        path: ["availableUntil"],
      });
    }
  });

export const selectRequestOfferSchema = z.object({
  offerId: z.string().min(1),
});

/** Быстрое согласие исполнителя выполнить работу (сроки по умолчанию) */
export const expressWorkConsentSchema = z.object({
  message: z.string().max(2000).optional(),
  proposedPrice: z.coerce.number().min(0).optional(),
  currency: z.string().length(3).optional(),
});

export const requestListQuerySchema = z.object({
  status: z.enum(REQUEST_STATUSES).optional(),
  priority: z.enum(REQUEST_PRIORITIES).optional(),
  categoryId: z.string().optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const assignRequestSchema = z.object({
  contractorId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().datetime().optional(),
  estimatedCost: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  internalComment: z.string().max(5000).optional(),
});

export const updateRequestPriceSchema = z.object({
  estimatedCost: z.number().min(0).optional(),
  proposedPrice: z.number().min(0).optional(),
  finalPrice: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
});

export const commentSchema = z.object({
  body: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

export const completeRequestSchema = z.object({
  resultDescription: z.string().min(10).max(10000),
  finalPrice: z.coerce.number().min(0).optional(),
});

export const rejectAssignmentSchema = z.object({
  reason: z.string().min(3).max(2000),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type SubmitRequestOfferInput = z.infer<typeof submitRequestOfferSchema>;
export type ExpressWorkConsentInput = z.infer<typeof expressWorkConsentSchema>;
export type RequestListQuery = z.infer<typeof requestListQuerySchema>;
