import { MongoClient, MongoServerError } from "mongodb";
import type { LoadedConfig } from "../config.js";
import {
  getCollections,
  ensureIndexes,
  type DbCollections,
} from "./collections.js";

export async function connectDatabase(
  config: LoadedConfig
): Promise<{ client: MongoClient; collections: DbCollections }> {
  const client = new MongoClient(config.mongodbUri);
  try {
    await client.connect();
    const collections = await getCollections(client.db());
    await ensureIndexes(collections);
    return { client, collections };
  } catch (err) {
    await client.close().catch(() => undefined);
    if (
      err instanceof MongoServerError &&
      (err.code === 13 || err.code === 18)
    ) {
      const hint =
        err.code === 18
          ? "Неверный логин или пароль (code 18)."
          : "Требуется аутентификация (code 13).";
      console.error(`
MongoDB: ${hint}

Укажите в .env один из вариантов:

1) Полный URI:
   MONGODB_URI=mongodb://USER:PASSWORD@localhost:27019/service_desk?authSource=admin
   (docker compose: порт 27019; свой MongoDB на 27017 — подставьте свой порт)

2) Логин и пароль отдельно:
   MONGODB_URI=mongodb://localhost:27019/service_desk
   MONGODB_USER=ваш_пользователь
   MONGODB_PASSWORD=ваш_пароль
   MONGODB_AUTH_SOURCE=admin

Для docker compose из этого репозитория (первый запуск):
   MONGODB_USER=service_desk
   MONGODB_PASSWORD=service_desk_dev
`);
    }
    throw err;
  }
}
