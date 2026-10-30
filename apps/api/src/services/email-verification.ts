import type { ObjectId } from "mongodb";
import type { DbCollections, UserDoc } from "../db/collections.js";
import { randomInt } from "crypto";
import { isCustomer } from "./user-roles.js";

export function generateEmailCode(): string {
  return String(randomInt(100000, 1000000));
}

/** Только исполнитель без роли заказчика — вход после кода всё равно через админа */
export function isContractorOnly(user: UserDoc): boolean {
  return user.roles.includes("contractor") && !isCustomer(user);
}

export async function applyEmailVerification(
  collections: DbCollections,
  userId: ObjectId,
  verificationId: ObjectId,
): Promise<{ message: string; active: boolean }> {
  const user = await collections.users.findOne({ _id: userId });
  if (!user) {
    throw new Error("User not found");
  }
  const now = new Date();
  const asCustomer = isCustomer(user);
  const contractorOnly = isContractorOnly(user);

  await collections.users.updateOne(
    { _id: userId },
    {
      $set: {
        emailVerifiedAt: now,
        updatedAt: now,
        ...(asCustomer ? { status: "active" as const } : {}),
      },
    },
  );
  await collections.emailVerifications.updateOne(
    { _id: verificationId },
    { $set: { usedAt: now } },
  );

  if (contractorOnly) {
    return {
      message:
        "Email подтверждён. Доступ откроется после проверки администратором.",
      active: false,
    };
  }
  if (user.roles.includes("contractor") && asCustomer) {
    return {
      message:
        "Email подтверждён. Можно войти и подавать заявки как заказчик. Режим исполнителя откроется после одобрения администратором.",
      active: true,
    };
  }
  return {
    message: "Email подтверждён. Можно войти в систему.",
    active: true,
  };
}
