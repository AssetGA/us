import { describe, it, expect } from "vitest";
import { hasPermission } from "@service-desk/shared";

describe("RBAC", () => {
  it("employee cannot assign", () => {
    expect(hasPermission(["employee"], "requests:assign")).toBe(false);
  });
  it("dispatcher can assign", () => {
    expect(hasPermission(["dispatcher"], "requests:assign")).toBe(true);
  });
  it("contractor sees assigned only via permission", () => {
    expect(hasPermission(["contractor"], "requests:read_assigned")).toBe(true);
    expect(hasPermission(["contractor"], "requests:read_all")).toBe(false);
  });
});
