"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type ApiUser } from "@/lib/api";
import { hasContractorRole, hasCustomerRole } from "@/lib/participation";

export function TelegramLinkBanner({ user }: { user: ApiUser }) {
  const [linkRequired, setLinkRequired] = useState(false);

  const isCustomer = hasCustomerRole(user);
  const isContractor = hasContractorRole(user);
  const relevant = (isCustomer || isContractor) && !user.telegramLinked;

  useEffect(() => {
    if (!relevant) return;
    api
      .me()
      .then((r) => setLinkRequired(Boolean(r.telegramNotifications?.linkRequired)))
      .catch(() => setLinkRequired(false));
  }, [relevant, user.id]);

  if (!relevant || !linkRequired) return null;

  return (
    <div className="border-b border-primary-soft-border bg-primary-soft px-4 py-2.5 text-center text-sm text-slate-900 md:text-base">
      Для работы с заявками нужен Telegram: отклики, новые заказы и статусы приходят в бот.{" "}
      <Link href="/profile" className="font-medium text-primary-strong hover:underline">
        Привязать в профиле
      </Link>
    </div>
  );
}
