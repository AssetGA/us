import { ObjectId } from "mongodb";
import type { BecomeContractorInput } from "@service-desk/shared";
import type { DbCollections, UserDoc } from "../db/collections.js";
import { AppError } from "../lib/errors.js";

export async function applyBecomeContractor(
  collections: DbCollections,
  user: UserDoc,
  body: BecomeContractorInput,
) {
  if (user.roles.includes("contractor")) {
    throw new AppError(400, "Роль исполнителя уже подключена");
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, "Сначала подтвердите email / регистрацию заказчика");
  }

  const unique = [...new Set(body.serviceCategoryIds)];
  for (const id of unique) {
    if (!ObjectId.isValid(id)) throw new AppError(400, "Некорректная категория");
  }
  const oids = unique.map((id) => new ObjectId(id));
  const count = await collections.categories.countDocuments({
    _id: { $in: oids },
    isActive: true,
  });
  if (count !== oids.length) {
    throw new AppError(400, "Выберите услуги только из актуального списка");
  }

  const now = new Date();
  const update: Record<string, unknown> = {
    updatedAt: now,
    serviceCategoryIds: oids,
    servicesDescription: body.servicesDescription,
    roles: [...user.roles, "contractor"],
  };
  const unset: Record<string, ""> = {};

  if (body.worksWithoutDocuments) {
    update.worksWithoutDocuments = true;
    unset.organizationName = "";
  } else {
    update.organizationName = body.organizationName;
    update.worksWithoutDocuments = false;
  }

  await collections.users.updateOne(
    { _id: user._id! },
    { $set: update, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
  );

  const staff = await collections.users
    .find({ roles: { $in: ["admin", "dispatcher"] }, status: "active" })
    .toArray();
  for (const d of staff) {
    await collections.notifications.insertOne({
      userId: d._id!,
      type: "contractor.registered",
      title: "Заявка исполнителя (существующий заказчик)",
      body: `${user.fullName}${body.worksWithoutDocuments ? " — без документов" : body.organizationName ? ` — ${body.organizationName}` : ""}`,
      meta: { userId: user._id!.toString() },
      createdAt: now,
    });
  }

  return collections.users.findOne({ _id: user._id! });
}

export async function applyBecomeCustomer(collections: DbCollections, user: UserDoc) {
  if (user.roles.includes("employee")) {
    return user;
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, "Сначала подтвердите email");
  }

  const now = new Date();
  await collections.users.updateOne(
    { _id: user._id! },
    {
      $set: {
        roles: [...user.roles, "employee"],
        status: "active",
        updatedAt: now,
      },
    },
  );
  return collections.users.findOne({ _id: user._id! });
}
