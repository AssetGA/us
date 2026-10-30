import { z } from "zod";

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const registerBase = z.object({
  fullName: z
    .string({ required_error: "Укажите ФИО" })
    .trim()
    .min(1, "Укажите ФИО")
    .min(2, "ФИО должно содержать не менее 2 символов")
    .max(200, "ФИО не должно превышать 200 символов"),
  email: z
    .string({ required_error: "Укажите корпоративную почту" })
    .trim()
    .min(1, "Укажите корпоративную почту")
    .email("Некорректный адрес email")
    .max(320, "Слишком длинный email"),
  phone: z.preprocess(
    (v) => (v === undefined || v === null ? "" : v),
    z
      .string()
      .trim()
      .refine((v) => v === "" || (v.length >= 10 && v.length <= 20), {
        message:
          "Телефон: укажите не менее 10 символов или оставьте поле пустым",
      })
      .transform((v) => (v === "" ? undefined : v)),
  ),
  password: z
    .string({ required_error: "Укажите пароль" })
    .min(1, "Укажите пароль")
    .min(8, "Пароль должен быть не короче 8 символов")
    .max(128, "Пароль слишком длинный"),
  /** Город заказчика (для подбора исполнителей), необязательно */
  city: z.preprocess(
    emptyToUndefined,
    z.string().max(100, "Город: не более 100 символов").optional(),
  ),
  asCustomer: z.boolean().default(true),
  asContractor: z.boolean().default(false),
  organizationName: z.preprocess(emptyToUndefined, z.string().max(300).optional()),
  /** Исполнитель без ИП / организации — отображается в портфолио для заказчиков */
  worksWithoutDocuments: z.boolean().optional().default(false),
  /** ID категорий услуг из справочника (для исполнителя) */
  serviceCategoryIds: z.array(z.string().min(1)).optional(),
  servicesDescription: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, "Комментарий: не более 2000 символов").optional(),
  ),
  /** Куда отправить код подтверждения (заказчик) */
  verifyChannel: z.preprocess(
    emptyToUndefined,
    z.enum(["whatsapp", "telegram", "email"]).optional(),
  ),
});

export const registerSchema = registerBase.superRefine((data, ctx) => {
  if (!data.asCustomer && !data.asContractor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Выберите тип участия: заказчик или исполнитель",
      path: ["asCustomer"],
    });
  }
  if (data.asCustomer && data.asContractor) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Можно выбрать только одну роль: заказчик или исполнитель",
      path: ["asCustomer"],
    });
  }
  if (data.asContractor) {
    if (!data.worksWithoutDocuments) {
      if (!data.organizationName || data.organizationName.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Укажите организацию / ИП или отметьте «без документов»",
          path: ["organizationName"],
        });
      }
    }
    const ids = data.serviceCategoryIds ?? [];
    if (ids.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите хотя бы один вид услуг из списка",
        path: ["serviceCategoryIds"],
      });
    }
  }
  if (data.asCustomer) {
    if (!data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите телефон для получения кода в WhatsApp или Telegram",
        path: ["phone"],
      });
    }
    if (!data.verifyChannel || data.verifyChannel === "email") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Выберите WhatsApp или Telegram для кода подтверждения",
        path: ["verifyChannel"],
      });
    }
  }
});

/** @deprecated используйте registerSchema с asContractor */
export const registerContractorSchema = registerBase
  .extend({
    asCustomer: z.literal(false).default(false),
    asContractor: z.literal(true).default(true),
  })
  .extend({
    serviceCategoryIds: z
      .array(z.string().min(1))
      .min(1, "Выберите хотя бы один вид услуг"),
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

export const verifyEmailCodeSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Код — 6 цифр"),
});

export const resendVerificationSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
  channel: z.enum(["email", "telegram", "whatsapp"]).default("telegram"),
});

export const verificationPresenceSchema = z.object({
  email: z.string().trim().email("Некорректный email"),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Укажите email" })
    .trim()
    .min(1, "Укажите email")
    .email("Некорректный адрес email"),
  password: z
    .string({ required_error: "Укажите пароль" })
    .min(1, "Укажите пароль"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Некорректный адрес email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Токен не указан"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов").max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
