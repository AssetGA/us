import { z } from "zod";

export const createAdminSchema = z.object({
  fullName: z
    .string({ required_error: "Укажите ФИО" })
    .trim()
    .min(2, "ФИО: не менее 2 символов")
    .max(200),
  email: z
    .string({ required_error: "Укажите email" })
    .trim()
    .email("Некорректный email"),
  password: z
    .string()
    .min(8, "Пароль: не менее 8 символов")
    .max(128)
    .optional(),
  /** Доступ к панели заявок (диспетчер) */
  asDispatcher: z.boolean().default(true),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
