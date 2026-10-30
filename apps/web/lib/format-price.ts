export function formatPrice(
  amount: unknown,
  currency: unknown = "KZT",
): string | null {
  if (amount === undefined || amount === null || amount === "") return null;
  const n = Number(amount);
  if (Number.isNaN(n)) return null;
  const cur = String(currency || "KZT");
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: cur,
    maximumFractionDigits: 2,
  }).format(n);
}

export function displayRequestPrice(request: Record<string, unknown>): string | null {
  const amount =
    request.finalPrice ?? request.estimatedCost ?? request.proposedPrice;
  return formatPrice(amount, request.currency);
}
