import { apiUrl, getApiBaseUrl } from "./api-base";

export class ApiValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export type PartyContact = {
  fullName: string;
  email: string;
  phone?: string;
  organizationName?: string;
  city?: string;
  contactPerson?: string;
};

export type ApiUser = {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  roles: string[];
  status: string;
  department?: string;
  position?: string;
  city?: string;
  organizationName?: string;
  worksWithoutDocuments?: boolean;
  servicesDescription?: string;
  serviceCategoryIds?: string[];
  emailVerifiedAt?: string;
  contractorApprovedAt?: string;
  guaranteedSpecialist?: boolean;
  telegramLinked?: boolean;
  ratingAsContractor?: { avg: number; count: number };
  ratingAsCustomer?: { avg: number; count: number };
  isSuperAdmin?: boolean;
};

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (cause) {
    const base =
      getApiBaseUrl() ||
      (typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:4000");
    const detail = cause instanceof Error ? cause.message : "";
    throw new Error(
      `Не удалось связаться с API (${base}). Запустите API: pnpm dev:api или pnpm dev из корня репозитория.${detail ? ` ${detail}` : ""}`,
    );
  }
  const rawText = await res.text();
  let data: { error?: { message?: string; fields?: Record<string, string> } } = {};
  if (rawText) {
    try {
      data = JSON.parse(rawText) as typeof data;
    } catch {
      data = {};
    }
  }
  if (!res.ok) {
    const message =
      data?.error?.message ??
      (rawText && rawText.length < 300 && !rawText.includes("<html")
        ? rawText.trim()
        : null) ??
      `Ошибка запроса (${res.status}) ${path}`;
    if (data?.error?.fields) {
      throw new ApiValidationError(message, data.error.fields);
    }
    const err = new Error(message);
    if (res.status === 401) {
      err.name = "ApiUnauthorizedError";
    }
    throw err;
  }
  if (!rawText) {
    return {} as T;
  }
  try {
    return JSON.parse(rawText) as T;
  } catch {
    throw new Error(`Некорректный ответ API (${res.status}) ${path}`);
  }
}

export const api = {
  register: (body: Record<string, unknown>) =>
    apiFetch<{
      email?: string;
      verifyChannel?: "email" | "telegram" | "whatsapp";
      telegramBotUrl?: string;
      message?: string;
    }>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  verificationPresence: (email: string) =>
    apiFetch<{
      codeResent?: boolean;
      message?: string;
      verifyChannel?: string;
      telegramBotUrl?: string;
    }>("/api/v1/auth/verification-presence", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resendVerification: (email: string, channel: "email" | "telegram" | "whatsapp") =>
    apiFetch<{
      message?: string;
      verifyChannel?: string;
      telegramBotUrl?: string;
    }>("/api/v1/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email, channel }),
    }),
  verifyEmail: (token: string) =>
    apiFetch("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
  verifyEmailCode: (email: string, code: string) =>
    apiFetch("/api/v1/auth/verify-email-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  registerContractor: (body: Record<string, string>) =>
    apiFetch("/api/v1/auth/register-contractor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (email: string, password: string) =>
    apiFetch<{ user: ApiUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ message?: string }>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ message?: string }>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    }),
  logout: () => apiFetch("/api/v1/auth/logout", { method: "POST" }),
  me: () =>
    apiFetch<{
      user: ApiUser;
      telegramNotifications?: { botConfigured: boolean; linkRequired: boolean };
    }>("/api/v1/users/me"),
  becomeContractor: (body: Record<string, unknown>) =>
    apiFetch<{ user: ApiUser; message?: string }>("/api/v1/users/me/become-contractor", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  becomeCustomer: () =>
    apiFetch<{ user: ApiUser; message?: string }>("/api/v1/users/me/become-customer", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  updateContractorProfile: (body: Record<string, unknown>) =>
    apiFetch<{ user: ApiUser }>("/api/v1/users/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  uploadAvatar: (body: { contentType: string; imageBase64: string }) =>
    apiFetch<{ user: ApiUser; avatarUrl: string }>("/api/v1/users/me/avatar", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  contractorHomeRequests: (query: Record<string, string> = {}) => {
    const params = new URLSearchParams(query);
    const qs = params.toString();
    return apiFetch<{ items: Record<string, unknown>[]; total: number }>(
      `/api/v1/requests/contractor-home${qs ? `?${qs}` : ""}`,
    );
  },
  categories: () =>
    apiFetch<{ items: { id: string; name: string; slug: string }[] }>(
      "/api/v1/categories",
    ),
  openMarketRequests: (params?: Record<string, string>) => {
    const search = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return apiFetch<{ items: Record<string, unknown>[]; total: number }>(
      `/api/v1/requests/open-market${search}`,
    );
  },
  submitWorkConsent: (
    id: string,
    body?: { message?: string; proposedPrice?: number; currency?: string },
  ) =>
    apiFetch<{ message?: string; offer: { id: string; status: string } }>(
      `/api/v1/requests/${id}/work-consent`,
      { method: "POST", body: JSON.stringify(body ?? {}) },
    ),
  submitRequestOffer: (
    id: string,
    body: {
      message?: string;
      availableFrom: string;
      availableUntil: string;
      proposedPrice?: number;
      currency?: string;
    },
  ) =>
    apiFetch(`/api/v1/requests/${id}/offers`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  selectRequestOffer: (id: string, offerId: string) =>
    apiFetch<{
      request: Record<string, unknown>;
      counterpartyContact?: PartyContact | null;
    }>(`/api/v1/requests/${id}/select-offer`, {
      method: "POST",
      body: JSON.stringify({ offerId }),
    }),
  requests: (params?: Record<string, string>) => {
    const search = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return apiFetch<{ items: Record<string, unknown>[]; total: number }>(
      `/api/v1/requests${search}`,
    );
  },
  updateRequestPrice: (id: string, body: Record<string, unknown>) =>
    apiFetch(`/api/v1/requests/${id}/price`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  createRequest: (body: unknown) =>
    apiFetch("/api/v1/requests", { method: "POST", body: JSON.stringify(body) }),
  request: (id: string) =>
    apiFetch<{
      request: Record<string, unknown>;
      ratings: {
        work: { score: number; comment?: string } | null;
        customerConduct: { score: number; comment?: string } | null;
        pendingKind: "work" | "customer_conduct" | null;
        bothSubmitted: boolean;
      };
      offers: {
        id: string;
        contractorUserId: string;
        contractorName?: string;
        message?: string;
        availableFrom: string;
        availableUntil: string;
        proposedPrice?: number;
        currency?: string;
        status: string;
      }[];
      openForOffers: boolean;
      counterpartyContact?: PartyContact | null;
    }>(`/api/v1/requests/${id}`),
  submitRequestRating: (id: string, body: { score: number; comment?: string }) =>
    apiFetch<{
      ok: boolean;
      closed: boolean;
      request: Record<string, unknown>;
      ratings: {
        work: { score: number; comment?: string } | null;
        customerConduct: { score: number; comment?: string } | null;
        pendingKind: "work" | "customer_conduct" | null;
        bothSubmitted: boolean;
      };
    }>(`/api/v1/requests/${id}/ratings`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  requestEvents: (id: string) =>
    apiFetch<{ events: { type: string; payload: unknown; createdAt: string }[] }>(
      `/api/v1/requests/${id}/events`,
    ),
  completeRequest: (
    id: string,
    body: { resultDescription: string; finalPrice?: number },
  ) =>
    apiFetch(`/api/v1/requests/${id}/complete`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  notifications: () =>
    apiFetch<{ items: { id: string; title: string; body: string; readAt?: string }[] }>(
      "/api/v1/notifications",
    ),
  telegramBotInfo: () =>
    apiFetch<{ configured: boolean; botUsername?: string; botUrl?: string }>(
      "/api/v1/public/telegram-bot",
    ),
  telegramLink: () =>
    apiFetch<{
      code: string;
      botUsername?: string;
      botUrl?: string;
      message?: string;
    }>("/api/v1/telegram/link", { method: "POST" }),
  reports: () => apiFetch<{ total: number; byStatus: Record<string, number> }>(
    "/api/v1/reports/requests",
  ),
  adminUsers: (query: Record<string, string> = {}) => {
    const qs = new URLSearchParams(query).toString();
    return apiFetch<{ items: ApiUser[]; page: number; limit: number; total: number }>(
      `/api/v1/admin/users${qs ? `?${qs}` : ""}`,
    );
  },
  setUserStatus: (id: string, status: "pending" | "active" | "blocked") =>
    apiFetch<{ user: ApiUser }>(`/api/v1/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  setGuaranteedSpecialist: (id: string, enabled: boolean) =>
    apiFetch<{ user: ApiUser }>(`/api/v1/admin/users/${id}/guaranteed-specialist`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  adminList: () => apiFetch<{ items: ApiUser[] }>("/api/v1/admin/admins"),
  createAdmin: (body: {
    fullName: string;
    email: string;
    password?: string;
    asDispatcher?: boolean;
  }) =>
    apiFetch<{ user: ApiUser; temporaryPassword?: string }>("/api/v1/admin/admins", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeAdmin: (id: string) =>
    apiFetch(`/api/v1/admin/admins/${id}`, { method: "DELETE" }),
};
