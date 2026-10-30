export * from "./roles.js";
export * from "./verification-policy.js";
export * from "./notification-policy.js";
export * from "./contractor-portfolio.js";
export * from "./request-voice-fill.js";
export * from "./schemas/auth.js";
export * from "./schemas/admin.js";
export * from "./schemas/request.js";
export * from "./schemas/rating.js";
export * from "./schemas/profile.js";
export * from "./zod-utils.js";

export type UserStatus = "pending" | "active" | "blocked";

export type RequestPriority = "low" | "normal" | "high" | "urgent";
export type RequestStatus =
  | "new"
  | "under_review"
  | "assigned"
  | "in_progress"
  | "waiting"
  | "completed"
  | "closed"
  | "rejected";
