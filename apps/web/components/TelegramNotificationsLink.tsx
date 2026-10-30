"use client";

import { useEffect, useState } from "react";
import { api, type ApiUser } from "@/lib/api";
import { hasContractorRole, hasCustomerRole } from "@/lib/participation";

type BotInfo = { configured: boolean; botUsername?: string; botUrl?: string };

export function TelegramNotificationsLink({ user }: { user: ApiUser }) {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkBot, setLinkBot] = useState<BotInfo | null>(null);
  const [botInfo, setBotInfo] = useState<BotInfo | null>(null);
  const [linkRequired, setLinkRequired] = useState(false);
  const [error, setError] = useState("");

  const isCustomer = hasCustomerRole(user);
  const isContractor = hasContractorRole(user);
  const canUse = isCustomer || isContractor;

  useEffect(() => {
    if (!canUse || user.telegramLinked) return;
    api.telegramBotInfo().then(setBotInfo).catch(() => setBotInfo({ configured: false }));
    api
      .me()
      .then((r) => setLinkRequired(Boolean(r.telegramNotifications?.linkRequired)))
      .catch(() => setLinkRequired(false));
  }, [canUse, user.telegramLinked, user.id]);

  if (!canUse) return null;

  if (user.telegramLinked) {
    return (
      <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-green-700">
          Telegram привязан — оповещения по заявкам дублируются в бот.
        </p>
      </section>
    );
  }

  const botUsername = linkBot?.botUsername ?? botInfo?.botUsername;
  const botUrl = linkBot?.botUrl ?? botInfo?.botUrl;

  const notificationLines: string[] = [];
  if (isCustomer) {
    notificationLines.push("отклики исполнителей, выбор исполнителя, статусы ваших заявок");
  }
  if (isContractor) {
    notificationLines.push("новые заказы, назначения, изменения по заявкам");
  }

  return (
    <section className="mt-8 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="font-medium">Telegram-оповещения</h2>
      {linkRequired && (
        <p className="mt-1 rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-sm text-amber-900">
          Обязательно для работы с заявками: без привязки нельзя создать заявку (заказчик) или
          откликнуться на заказ (исполнитель).
        </p>
      )}
      <p className="mt-1 text-sm text-slate-600">
        Привяжите Telegram, чтобы получать уведомления в боте: {notificationLines.join("; ")}.
        Подтверждение регистрации через Telegram — отдельный сценарий при регистрации; здесь только
        оповещения по уже активному аккаунту.
      </p>

      {botInfo?.configured === false && (
        <p className="mt-2 text-sm text-amber-800">
          Бот не настроен на сервере. Администратору нужно указать TELEGRAM_BOT_TOKEN и
          TELEGRAM_BOT_USERNAME в .env.
        </p>
      )}

      {botUsername && botUrl && (
        <p className="mt-3 text-sm">
          Бот:{" "}
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-strong underline"
          >
            {botUsername}
          </a>
        </p>
      )}

      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li>
          Откройте бота{" "}
          {botUrl ? (
            <a href={botUrl} target="_blank" rel="noopener noreferrer" className="text-primary-strong underline">
              {botUsername ?? "в Telegram"}
            </a>
          ) : (
            "в Telegram"
          )}{" "}
          и нажмите «Start» / «Запустить».
        </li>
        <li>Нажмите ниже «Получить код привязки» на сайте.</li>
        <li>
          Отправьте боту одним сообщением:{" "}
          <span className="font-mono text-slate-900">/link КОД</span> (код покажется после нажатия).
        </li>
        <li>Дождитесь ответа бота «Telegram успешно привязан» и обновите страницу профиля.</li>
      </ol>

      {linkCode ? (
        <div className="mt-3 rounded border border-slate-300 bg-white p-3">
          <p className="text-sm text-slate-600">Отправьте боту {botUsername ?? ""}:</p>
          <p className="mt-1 font-mono text-lg">
            /link {linkCode}{" "}
            <span className="text-sm font-sans text-slate-500">(действует 10 мин.)</span>
          </p>
        </div>
      ) : (
        <>
          <button
            type="button"
            disabled={botInfo?.configured === false}
            className="mt-3 rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            onClick={async () => {
              setError("");
              try {
                const res = await api.telegramLink();
                setLinkCode(res.code);
                if (res.botUsername || res.botUrl) {
                  setLinkBot({
                    configured: true,
                    botUsername: res.botUsername,
                    botUrl: res.botUrl,
                  });
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Ошибка");
              }
            }}
          >
            Получить код привязки
          </button>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </>
      )}
    </section>
  );
}
