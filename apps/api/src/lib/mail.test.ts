import { describe, it, expect } from "vitest";
import { isEmailConfigured } from "./mail.js";
import type { Env } from "../config.js";

function env(partial: Partial<Env>): Env {
  return partial as Env;
}

describe("isEmailConfigured", () => {
  it("false when any SMTP field missing", () => {
    expect(isEmailConfigured(env({ SMTP_USER: "a", SMTP_PASSWORD: "b" }))).toBe(false);
    expect(
      isEmailConfigured(env({ SMTP_USER: "a", SMTP_PASSWORD: "b", SMTP_FROM: "a@b.c" })),
    ).toBe(true);
  });

  it("accepts legacy SMTP_PASS and EMAIL_FROM", () => {
    expect(
      isEmailConfigured(
        env({ SMTP_USER: "u", SMTP_PASS: "p", EMAIL_FROM: "u@example.com" }),
      ),
    ).toBe(true);
  });
});
