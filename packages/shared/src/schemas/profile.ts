import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

export const updateContractorProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(200).optional(),
  phone: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .refine((v) => !v || (v.length >= 10 && v.length <= 20), {
        message: "Телефон: от 10 до 20 символов",
      })
      .optional(),
  ),
  city: z.preprocess(emptyToUndefined, z.string().max(100).optional()),
  organizationName: z.preprocess(
    emptyToUndefined,
    z.string().trim().max(300).optional(),
  ),
  worksWithoutDocuments: z.boolean().optional(),
  servicesDescription: z.preprocess(
    emptyToUndefined,
    z.string().max(2000).optional(),
  ),
  serviceCategoryIds: z.array(z.string().min(1)).min(1).optional(),
}).superRefine((data, ctx) => {
  if (data.worksWithoutDocuments === true) return;
  if (data.organizationName !== undefined && data.organizationName.length > 0) {
    if (data.organizationName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Название организации / ИП — не менее 2 символов",
        path: ["organizationName"],
      });
    }
    return;
  }
  if (
    data.worksWithoutDocuments === false ||
    data.organizationName !== undefined
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите организацию / ИП или отметьте «без документов»",
      path: ["organizationName"],
    });
  }
});

/** Заказчик добавляет роль исполнителя в том же аккаунте */
export const becomeContractorSchema = z
  .object({
    organizationName: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(300).optional(),
    ),
    worksWithoutDocuments: z.boolean().optional().default(false),
    serviceCategoryIds: z
      .array(z.string().min(1))
      .min(1, "Выберите хотя бы один вид услуг"),
    servicesDescription: z.preprocess(
      emptyToUndefined,
      z.string().max(2000).optional(),
    ),
  })
  .superRefine((data, ctx) => {
    if (data.worksWithoutDocuments) return;
    if (!data.organizationName || data.organizationName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите организацию / ИП или отметьте «без документов»",
        path: ["organizationName"],
      });
    }
  });

export type BecomeContractorInput = z.infer<typeof becomeContractorSchema>;

export const updateAvatarSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  imageBase64: z
    .string()
    .min(1)
    .max(900_000, "Файл слишком большой (макс. ~650 КБ)"),
});

export type UpdateContractorProfileInput = z.infer<typeof updateContractorProfileSchema>;
