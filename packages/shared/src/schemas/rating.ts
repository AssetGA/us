import { z } from "zod";

export const REQUEST_RATING_KINDS = ["work", "customer_conduct"] as const;
export type RequestRatingKind = (typeof REQUEST_RATING_KINDS)[number];

export const submitRequestRatingSchema = z.object({
  score: z.coerce
    .number({ required_error: "Укажите оценку от 1 до 5 звёзд" })
    .int("Оценка должна быть целым числом")
    .min(1, "Минимум 1 звезда")
    .max(5, "Максимум 5 звёзд"),
  /** Только для оценки работы исполнителя; для лояльности заказчика не используется */
  comment: z.string().max(2000, "Комментарий: не более 2000 символов").optional(),
});

export type SubmitRequestRatingInput = z.infer<typeof submitRequestRatingSchema>;
