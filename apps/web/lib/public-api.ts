import { apiUrl } from "./api-base";

export async function publicCategories() {
  const res = await fetch(apiUrl("/api/v1/public/categories"), {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Не удалось загрузить каталог услуг");
  return res.json() as Promise<{ items: { id: string; name: string; slug: string }[] }>;
}

export type PublicRequestItem = {
  id: string;
  number: string;
  title: string;
  status: string;
  priority: string;
  categoryName: string;
  createdAt: string;
  proposedPrice?: number;
  estimatedCost?: number;
  finalPrice?: number;
  currency?: string;
  site?: string;
  validUntil?: string;
};

export async function publicRequests(query: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const res = await fetch(
    apiUrl(`/api/v1/public/requests${qs ? `?${qs}` : ""}`),
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Не удалось загрузить заказы");
  return res.json() as Promise<{
    items: PublicRequestItem[];
    page: number;
    limit: number;
    total: number;
  }>;
}

export type PublicContractorItem = {
  id: string;
  displayName: string;
  city?: string;
  worksWithoutDocuments?: boolean;
  portfolio?: string;
  servicesDescription?: string;
  serviceNames: string[];
  ratingAsContractor?: { avg: number; count: number };
  avatarUrl?: string;
  guaranteedSpecialist?: boolean;
};

export async function publicContractors(query: Record<string, string> = {}) {
  const params = new URLSearchParams(query);
  const qs = params.toString();
  const res = await fetch(
    apiUrl(`/api/v1/public/contractors${qs ? `?${qs}` : ""}`),
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error("Не удалось загрузить исполнителей");
  return res.json() as Promise<{
    items: PublicContractorItem[];
    page: number;
    limit: number;
    total: number;
  }>;
}
