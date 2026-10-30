import { randomBytes } from "crypto";
import type { DbCollections, SessionDoc } from "../db/collections.js";
import type { ObjectId } from "mongodb";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function createSessionId(): string {
  return randomBytes(32).toString("hex");
}

export async function createSession(
  collections: DbCollections,
  userId: ObjectId,
  meta?: { ip?: string; userAgent?: string },
): Promise<string> {
  const sessionId = createSessionId();
  const now = new Date();
  const doc: SessionDoc = {
    _id: sessionId,
    userId,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
    createdAt: now,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  };
  await collections.sessions.insertOne(doc);
  return sessionId;
}

export async function deleteSession(
  collections: DbCollections,
  sessionId: string,
): Promise<void> {
  await collections.sessions.deleteOne({ _id: sessionId });
}

export async function deleteAllUserSessions(
  collections: DbCollections,
  userId: ObjectId,
): Promise<void> {
  await collections.sessions.deleteMany({ userId });
}

export async function getSessionUserId(
  collections: DbCollections,
  sessionId: string,
): Promise<ObjectId | null> {
  const session = await collections.sessions.findOne({
    _id: sessionId,
    expiresAt: { $gt: new Date() },
  });
  return session?.userId ?? null;
}
