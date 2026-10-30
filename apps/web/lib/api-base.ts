/** Локальные URL API — в dev запросы идут через прокси Next (same-origin). */
const LOCAL_DEV_API = new Set([
  "http://localhost:4000",
  "http://127.0.0.1:4000",
]);

function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

/** Базовый URL для fetch: в dev браузер — относительный путь через rewrite. */
export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const inBrowser = typeof window !== "undefined";

  if (inBrowser && process.env.NODE_ENV === "development") {
    if (!configured || LOCAL_DEV_API.has(normalizeBase(configured))) {
      return "";
    }
  }

  if (configured) return normalizeBase(configured);
  if (inBrowser) return "";
  return normalizeBase(process.env.API_URL?.trim() ?? "http://127.0.0.1:4000");
}

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${p}`;
}
