import "../load-env.js";
import { loadConfig } from "../config.js";
import { connectDatabase } from "../db/connect.js";
import { hashPassword } from "../lib/password.js";
import type { UserInsert } from "../db/collections.js";

async function seed() {
  const config = loadConfig();
  const { client, collections } = await connectDatabase(config);

  const categories = [
    { name: "Уборка квартир", slug: "apartment-cleaning", sortOrder: 1 },
    { name: "Электрик", slug: "electrical", sortOrder: 2 },
    { name: "Сантехник", slug: "plumbing", sortOrder: 3 },
    { name: "Мелкий ремонт", slug: "repair", sortOrder: 4 },
    { name: "IT и техника", slug: "it", sortOrder: 5 },
  ];
  for (const c of categories) {
    await collections.categories.updateOne(
      { slug: c.slug },
      { $set: { name: c.name, sortOrder: c.sortOrder, isActive: true } },
      { upsert: true },
    );
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@company.local";
  const existing = await collections.users.findOne({ email: adminEmail });
  const now = new Date();
  if (!existing) {
    const admin: UserInsert = {
      fullName: "System Admin",
      email: adminEmail,
      passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "Admin12345!"),
      roles: ["admin", "dispatcher"],
      status: "active",
      emailVerifiedAt: now,
      isSuperAdmin: true,
      createdAt: now,
      updatedAt: now,
    };
    await collections.users.insertOne(admin);
    console.info(`Admin created: ${adminEmail}`);
  } else if (!existing.isSuperAdmin) {
    await collections.users.updateOne(
      { _id: existing._id },
      { $set: { isSuperAdmin: true, updatedAt: now } },
    );
    console.info(`Marked ${adminEmail} as super admin`);
  }

  console.info("Seed complete");
  await client.close();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
