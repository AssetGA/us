import type { RequestListQuery } from "@service-desk/shared";
import { ObjectId } from "mongodb";

/** Актуальная цена: итог → смета → предложение заказчика */
export function effectivePriceExpr() {
  return {
    $ifNull: [
      "$finalPrice",
      { $ifNull: ["$estimatedCost", { $ifNull: ["$proposedPrice", null] }] },
    ],
  };
}

export function applyRequestListQuery(
  baseFilter: Record<string, unknown>,
  query: RequestListQuery,
): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...baseFilter };

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.categoryId && ObjectId.isValid(query.categoryId)) {
    filter.categoryId = new ObjectId(query.categoryId);
  }

  if (query.createdFrom || query.createdTo) {
    const createdAt: Record<string, Date> = {};
    if (query.createdFrom) {
      createdAt.$gte = new Date(query.createdFrom);
    }
    if (query.createdTo) {
      const to = new Date(query.createdTo);
      to.setHours(23, 59, 59, 999);
      createdAt.$lte = to;
    }
    filter.createdAt = createdAt;
  }

  if (query.q?.trim()) {
    const escaped = query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = { $regex: escaped, $options: "i" };
    filter.$and = [
      ...((filter.$and as unknown[]) ?? []),
      { $or: [{ title: regex }, { number: regex }, { description: regex }] },
    ];
  }

  const priceExpr = effectivePriceExpr();
  const priceConds: Record<string, unknown>[] = [];

  if (query.minPrice !== undefined) {
    priceConds.push({ $gte: [priceExpr, query.minPrice] });
  }
  if (query.maxPrice !== undefined) {
    priceConds.push({ $lte: [priceExpr, query.maxPrice] });
  }
  if (priceConds.length > 0) {
    filter.$expr =
      priceConds.length === 1 ? priceConds[0] : { $and: priceConds };
  }

  return filter;
}
