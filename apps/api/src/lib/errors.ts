import type { Response } from "express";
import { ZodError } from "zod";
import { zodToFieldErrors } from "@service-desk/shared";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function sendError(res: Response, err: unknown): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: "Проверьте заполнение полей",
        code: "validation",
        fields: zodToFieldErrors(err),
      },
    });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { message: "Internal server error" } });
}
