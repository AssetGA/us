import type { RequestFilterValues } from "@/components/RequestFilters";

export function filtersToQuery(
  f: RequestFilterValues,
  extra?: { status?: string },
): Record<string, string> {
  const q: Record<string, string> = {};
  const status = f.status || extra?.status;
  if (status) q.status = status;
  if (f.priority) q.priority = f.priority;
  if (f.categoryId) q.categoryId = f.categoryId;
  if (f.createdFrom) q.createdFrom = new Date(f.createdFrom).toISOString();
  if (f.createdTo) q.createdTo = new Date(f.createdTo).toISOString();
  if (f.minPrice) q.minPrice = f.minPrice;
  if (f.maxPrice) q.maxPrice = f.maxPrice;
  if (f.q.trim()) q.q = f.q.trim();
  return q;
}

export function buildRequestsSearchParams(
  f: RequestFilterValues,
  extra?: { status?: string },
): string {
  const q = filtersToQuery(f, extra);
  const params = new URLSearchParams(q);
  const s = params.toString();
  return s ? `?${s}` : "";
}
