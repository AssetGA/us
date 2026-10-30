import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Env } from "../config.js";

vi.mock("../lib/mail.js", () => ({
  isEmailConfigured: vi.fn(() => true),
  sendEmail: vi.fn(async () => {}),
}));

describe("deliverRegistrationCode email path", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls sendEmail with code and links for contractor channel", async () => {
    const mail = await import("../lib/mail.js");
    const { deliverRegistrationCode } = await import("./registration-delivery.js");
    const env = {
      WEB_ORIGIN: "http://localhost:3000",
    } as Env;
    const collections = {} as import("../db/collections.js").DbCollections;

    await deliverRegistrationCode(collections, env, {
      channel: "email",
      userId: { toString: () => "1" } as import("mongodb").ObjectId,
      email: "test@example.com",
      code: "123456",
      token: "abc-token",
      intro: "Регистрация: исполнитель.",
    });

    expect(mail.sendEmail).toHaveBeenCalledWith(
      env,
      "test@example.com",
      "Код подтверждения регистрации",
      expect.stringContaining("123456"),
    );
    const body = (mail.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][3] as string;
    expect(body).toContain("/verify-email?email=test%40example.com");
    expect(body).toContain("token=abc-token");
  });
});
