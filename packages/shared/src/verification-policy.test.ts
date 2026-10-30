import { describe, it, expect } from "vitest";
import {
  VERIFICATION_RESEND_ABSENCE_MS,
  msUntilVerificationResendAllowed,
  verificationResendAllowedAfterLastVisit,
} from "./verification-policy.js";

describe("verificationResendAllowedAfterLastVisit", () => {
  it("disallows when never visited", () => {
    expect(verificationResendAllowedAfterLastVisit(undefined)).toBe(false);
  });

  it("disallows within 4 hours", () => {
    const last = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(verificationResendAllowedAfterLastVisit(last)).toBe(false);
  });

  it("allows after more than 4 hours", () => {
    const last = new Date(Date.now() - VERIFICATION_RESEND_ABSENCE_MS - 1000);
    expect(verificationResendAllowedAfterLastVisit(last)).toBe(true);
  });
});

describe("msUntilVerificationResendAllowed", () => {
  it("returns full window when no prior visit", () => {
    expect(msUntilVerificationResendAllowed(undefined)).toBe(
      VERIFICATION_RESEND_ABSENCE_MS,
    );
  });
});
