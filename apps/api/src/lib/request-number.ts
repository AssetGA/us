import type { DbCollections } from "../db/collections.js";

export async function generateRequestNumber(collections: DbCollections): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SR-${year}-`;
  const last = await collections.serviceRequests
    .find({ number: { $regex: `^${prefix}` } })
    .sort({ number: -1 })
    .limit(1)
    .toArray();
  let seq = 1;
  if (last[0]) {
    const part = last[0].number.slice(prefix.length);
    seq = parseInt(part, 10) + 1;
  }
  return `${prefix}${String(seq).padStart(5, "0")}`;
}
