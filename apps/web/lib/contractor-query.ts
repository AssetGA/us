import type { ContractorFilterValues } from "@/components/ContractorFilters";

export function contractorFiltersToQuery(f: ContractorFilterValues): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.q.trim()) q.q = f.q.trim();
  if (f.city.trim()) q.city = f.city.trim();
  if (f.categoryId) q.categoryId = f.categoryId;
  return q;
}
