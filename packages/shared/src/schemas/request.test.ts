import { describe, it, expect } from "vitest";
import {
  expressWorkConsentSchema,
  submitRequestOfferSchema,
  selectRequestOfferSchema,
  createRequestSchema,
} from "./request.js";

describe("expressWorkConsentSchema", () => {
  it("accepts empty body", () => {
    expect(expressWorkConsentSchema.safeParse({}).success).toBe(true);
  });

  it("accepts message and price", () => {
    const r = expressWorkConsentSchema.safeParse({
      message: "Готов выполнить",
      proposedPrice: 1000,
      currency: "KZT",
    });
    expect(r.success).toBe(true);
  });
});

describe("submitRequestOfferSchema", () => {
  it("rejects until before from", () => {
    const from = new Date(Date.now() + 3600_000).toISOString();
    const until = new Date(Date.now() + 1800_000).toISOString();
    const r = submitRequestOfferSchema.safeParse({
      availableFrom: from,
      availableUntil: until,
    });
    expect(r.success).toBe(false);
  });

  it("accepts valid window", () => {
    const from = new Date(Date.now() + 3600_000).toISOString();
    const until = new Date(Date.now() + 7200_000).toISOString();
    const r = submitRequestOfferSchema.safeParse({
      availableFrom: from,
      availableUntil: until,
    });
    expect(r.success).toBe(true);
  });
});

describe("selectRequestOfferSchema", () => {
  it("requires offerId", () => {
    expect(selectRequestOfferSchema.safeParse({}).success).toBe(false);
    expect(selectRequestOfferSchema.safeParse({ offerId: "abc" }).success).toBe(true);
  });
});

describe("createRequestSchema", () => {
  it("requires validUntil in the future", () => {
    const r = createRequestSchema.safeParse({
      title: "Test order",
      description: "Long enough description here",
      categoryId: "507f1f77bcf86cd799439011",
      location: { site: "Office" },
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(r.success).toBe(true);
  });
});
