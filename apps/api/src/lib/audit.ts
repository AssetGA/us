import type { AuditLogInsert, DbCollections } from "../db/collections.js";
import type { ObjectId } from "mongodb";

export async function writeAudit(
  collections: DbCollections,
  entry: {
    userId?: ObjectId;
    action: string;
    resource: string;
    resourceId?: string;
    ip?: string;
    success: boolean;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const doc: AuditLogInsert = {
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    resourceId: entry.resourceId,
    ip: entry.ip,
    success: entry.success,
    details: entry.details,
    createdAt: new Date(),
  };
  await collections.auditLogs.insertOne(doc);
}
