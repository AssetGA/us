import { describe, it, expect } from "vitest";
import {
  REQUEST_WORK_NOTIFICATION_RETENTION_MS,
  requestWorkNotificationsExpireAt,
} from "./notification-policy.js";

describe("requestWorkNotificationsExpireAt", () => {
  it("adds 7 days", () => {
    const completed = new Date("2026-01-01T12:00:00.000Z");
    const exp = requestWorkNotificationsExpireAt(completed);
    expect(exp.getTime() - completed.getTime()).toBe(REQUEST_WORK_NOTIFICATION_RETENTION_MS);
  });
});
