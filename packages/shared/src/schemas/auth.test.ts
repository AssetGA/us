import { describe, it, expect } from "vitest";
import { registerSchema, zodToFieldErrors } from "../index.js";

describe("registerSchema", () => {
  it("requires core fields when body is empty", () => {
    const result = registerSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = zodToFieldErrors(result.error);
      expect(fields.fullName).toBeTruthy();
      expect(fields.email).toBeTruthy();
      expect(fields.password).toBeTruthy();
      expect(fields.phone).toBeUndefined();
    }
  });

  it("rejects both customer and contractor roles", () => {
    const result = registerSchema.safeParse({
      fullName: "Иван Иванов",
      email: "both@company.local",
      password: "SecurePass1",
      phone: "+77001234567",
      verifyChannel: "telegram",
      asCustomer: true,
      asContractor: true,
      organizationName: "ИП",
      serviceCategoryIds: ["507f1f77bcf86cd799439011"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts contractor without organization when worksWithoutDocuments", () => {
    const result = registerSchema.safeParse({
      fullName: "Иван Иванов",
      email: "ivan2@company.local",
      password: "SecurePass1",
      asCustomer: false,
      asContractor: true,
      worksWithoutDocuments: true,
      serviceCategoryIds: ["507f1f77bcf86cd799439011"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts contractor registration without phone", () => {
    const result = registerSchema.safeParse({
      fullName: "Иван Иванов",
      email: "ivan@company.local",
      password: "SecurePass1",
      asCustomer: false,
      asContractor: true,
      organizationName: "ИП Иванов",
      serviceCategoryIds: ["507f1f77bcf86cd799439011"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBeUndefined();
    }
  });
});
