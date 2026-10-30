"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestOfferForm } from "@/components/RequestOfferForm";
import { RequestWorkConsentButton } from "@/components/RequestWorkConsentButton";
import { RequestCounterpartyContacts } from "@/components/RequestCounterpartyContacts";
import type { PartyContact } from "@/lib/api";
import {
  RequestRatingsPanel,
  type RequestRatingsState,
} from "@/components/RequestRatingsPanel";
import { StarRatingInput } from "@/components/StarRatingInput";
import { api, type ApiUser } from "@/lib/api";
import { formatPrice } from "@/lib/format-price";

type OfferRow = {
  id: string;
  contractorUserId: string;
  contractorName?: string;
  contractorRating?: { avg: number; count: number };
  portfolioPreview?: string;
  message?: string;
  availableFrom: string;
  availableUntil: string;
  proposedPrice?: number;
  currency?: string;
  status: string;
};

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [request, setRequest] = useState<Record<string, unknown> | null>(null);
  const [ratings, setRatings] = useState<RequestRatingsState | null>(null);
  const [events, setEvents] = useState<
    { type: string; payload: unknown; createdAt: string }[]
  >([]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [priceMsg, setPriceMsg] = useState("");
  const [completeResult, setCompleteResult] = useState("");
  const [completePrice, setCompletePrice] = useState("");
  const [completeMsg, setCompleteMsg] = useState("");
  const [customerLoyaltyScore, setCustomerLoyaltyScore] = useState(0);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [openForOffers, setOpenForOffers] = useState(false);
  const [selectMsg, setSelectMsg] = useState("");
  const [counterpartyContact, setCounterpartyContact] = useState<PartyContact | null>(null);
  const [showOfferDetails, setShowOfferDetails] = useState(false);

  const isStaff = user?.roles.some((r) => ["dispatcher", "admin"].includes(r));

  function reload() {
    return Promise.all([api.request(id), api.requestEvents(id)]).then(([r, ev]) => {
      setRequest(r.request);
      setRatings(r.ratings);
      setOffers(r.offers ?? []);
      setOpenForOffers(Boolean(r.openForOffers));
      setCounterpartyContact(r.counterpartyContact ?? null);
      setEvents(ev.events);
      const req = r.request;
      const est = req.estimatedCost ?? req.proposedPrice;
      if (est !== undefined && est !== null) setEstimatedCost(String(est));
    });
  }

  useEffect(() => {
    api
      .me()
      .then(({ user: u }) => {
        setUser(u);
        return reload();
      })
      .catch(() => router.push("/login"));
  }, [id, router]);

  async function saveEstimatedPrice(e: React.FormEvent) {
    e.preventDefault();
    setPriceMsg("");
    try {
      await api.updateRequestPrice(id, {
        estimatedCost: Number(estimatedCost),
        currency: (request?.currency as string) || "KZT",
      });
      setPriceMsg("Смета сохранена");
      await reload();
    } catch (err) {
      setPriceMsg(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function submitComplete(e: React.FormEvent) {
    e.preventDefault();
    setCompleteMsg("");
    if (customerLoyaltyScore < 1) {
      setCompleteMsg("Поставьте оценку лояльности заказчика — от 1 до 5 звёзд.");
      return;
    }
    try {
      const body: { resultDescription: string; finalPrice?: number } = {
        resultDescription: completeResult,
      };
      const fp = completePrice.trim();
      if (fp) body.finalPrice = Number(fp);
      await api.completeRequest(id, body);
      await api.submitRequestRating(id, { score: customerLoyaltyScore });
      setCompleteMsg(
        "Работа завершена. Оценка лояльности заказчика сохранена. Заказчик может оценить качество работ.",
      );
      setCompleteResult("");
      setCompletePrice("");
      setCustomerLoyaltyScore(0);
      await reload();
      document.getElementById("request-ratings")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setCompleteMsg(err instanceof Error ? err.message : "Ошибка");
    }
  }

  async function submitRating(score: number, comment?: string) {
    const res = await api.submitRequestRating(id, {
      score,
      ...(comment ? { comment } : {}),
    });
    setRequest(res.request);
    setRatings(res.ratings);
    if (res.closed) {
      await api.requestEvents(id).then((ev) => setEvents(ev.events));
    }
  }

  if (!user || !request) return null;

  const currency = String(request.currency ?? "KZT");
  const isRequester = String(request.requesterId ?? "") === user.id;
  const isAssignee = String(request.assigneeId ?? "") === user.id;
  const isContractor =
    user.roles.includes("contractor") && Boolean(user.contractorApprovedAt);
  const canComplete =
    isAssignee && ["assigned", "in_progress", "waiting"].includes(String(request.status));
  const canOffer = openForOffers && isContractor && !isRequester;
  const myPendingOffer = offers.find(
    (o) => o.contractorUserId === user.id && o.status === "pending",
  );
  const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU");
  const contactRoleLabel: "заказчика" | "исполнителя" = isRequester
    ? "исполнителя"
    : "заказчика";

  async function pickOffer(offerId: string) {
    setSelectMsg("");
    try {
      const res = await api.selectRequestOffer(id, offerId);
      setRequest(res.request);
      setCounterpartyContact(res.counterpartyContact ?? null);
      setOpenForOffers(false);
      setSelectMsg("Исполнитель согласован. Контакты открыты ниже.");
      await reload();
    } catch (err) {
      setSelectMsg(err instanceof Error ? err.message : "Ошибка");
    }
  }

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-semibold">
        {String(request.number)} — {String(request.title)}
      </h1>
      <p className="mt-2 text-slate-600">Статус: {String(request.status)}</p>
      {typeof request.validUntil === "string" && (
        <p className="text-sm text-slate-500">
          Срок приёма откликов: {fmt(request.validUntil)}
        </p>
      )}
      {typeof request.scheduledStart === "string" && typeof request.scheduledEnd === "string" && (
        <p className="text-sm text-slate-500">
          Согласовано выполнение: {fmt(request.scheduledStart)} — {fmt(request.scheduledEnd)}
        </p>
      )}

      <dl className="mt-4 grid gap-2 rounded-lg border bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Цена заказчика</dt>
          <dd>{formatPrice(request.proposedPrice, currency) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Смета / согласованная</dt>
          <dd>{formatPrice(request.estimatedCost, currency) ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Итоговая</dt>
          <dd>{formatPrice(request.finalPrice, currency) ?? "—"}</dd>
        </div>
      </dl>

      {counterpartyContact && (
        <RequestCounterpartyContacts contact={counterpartyContact} roleLabel={contactRoleLabel} />
      )}

      {isRequester && openForOffers && (
        <section className="mt-6">
          <h2 className="font-medium">Желающие выполнить заказ</h2>
          <p className="mt-1 text-sm text-slate-600">
            Исполнители подтвердили согласие. Выберите одного — после этого откроются контакты.
          </p>
          {selectMsg && <p className="mt-2 text-sm text-slate-700">{selectMsg}</p>}
          <ul className="mt-3 space-y-2">
            {offers.length === 0 && (
              <li className="rounded border bg-white px-4 py-3 text-sm text-slate-500">
                Пока нет откликов
              </li>
            )}
            {offers.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded border bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">{o.contractorName ?? "Исполнитель"}</div>
                  {o.contractorRating && o.contractorRating.count > 0 && (
                    <div className="text-amber-700">
                      ★ {o.contractorRating.avg.toFixed(1)} ({o.contractorRating.count})
                    </div>
                  )}
                  <div className="text-slate-600">
                    Готов выполнить: {fmt(o.availableFrom)} — {fmt(o.availableUntil)}
                  </div>
                  {o.proposedPrice !== undefined && (
                    <div>{formatPrice(o.proposedPrice, o.currency ?? currency)}</div>
                  )}
                  {o.message && <p className="mt-1 text-slate-500">{o.message}</p>}
                  {o.portfolioPreview && (
                    <p className="mt-1 line-clamp-3 text-xs text-slate-500">{o.portfolioPreview}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => pickOffer(o.id)}
                  className="rounded bg-primary px-3 py-1.5 text-white hover:bg-primary-hover"
                >
                  Согласовать
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {canOffer && (
        <>
          <RequestWorkConsentButton
            currency={currency}
            hasPendingOffer={Boolean(myPendingOffer)}
            onConsent={async () => {
              await api.submitWorkConsent(id);
              await reload();
            }}
            onOpenDetails={() => setShowOfferDetails(true)}
          />
          {showOfferDetails && (
            <RequestOfferForm
              validUntil={request.validUntil as string | undefined}
              currency={currency}
              onSubmit={async (body) => {
                await api.submitRequestOffer(id, body);
                setShowOfferDetails(false);
                await reload();
              }}
            />
          )}
        </>
      )}

      {canComplete && (
        <form onSubmit={submitComplete} className="mt-6 space-y-3 rounded-lg border bg-slate-50 p-4">
          <h2 className="font-medium">Завершить работу</h2>
          <p className="text-sm text-slate-600">
            Кратко опишите, что сделано. Лояльность заказчика оценивается только звёздами (1–5), без
            текста.
          </p>
          <StarRatingInput
            label="Лояльность и отношение заказчика к исполнителю"
            hint="Моральные качества, уважение, честность, адекватность требований."
            value={customerLoyaltyScore}
            onChange={setCustomerLoyaltyScore}
          />
          <label className="block text-sm">
            Что выполнено (отчёт о работе)
            <textarea
              value={completeResult}
              onChange={(e) => setCompleteResult(e.target.value)}
              required
              minLength={10}
              rows={3}
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Например: заменён фильтр, проверен холодный контур."
            />
          </label>
          <label className="block text-sm">
            Итоговая цена (необязательно)
            <input
              type="number"
              min={0}
              step="0.01"
              value={completePrice}
              onChange={(e) => setCompletePrice(e.target.value)}
              className="mt-1 w-40 rounded border px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm text-white">
            Выполнено
          </button>
          {completeMsg && <p className="text-sm text-slate-600">{completeMsg}</p>}
        </form>
      )}

      <RequestRatingsPanel
        status={String(request.status)}
        ratings={ratings}
        onSubmitRating={submitRating}
      />

      {isStaff && (
        <form onSubmit={saveEstimatedPrice} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            Установить смету
            <input
              type="number"
              min={0}
              step="0.01"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="mt-1 w-40 rounded border px-3 py-2"
            />
          </label>
          <button type="submit" className="rounded bg-primary px-3 py-2 text-sm text-white">
            Сохранить цену
          </button>
          {priceMsg && <span className="text-sm text-slate-600">{priceMsg}</span>}
        </form>
      )}

      <p className="mt-4 whitespace-pre-wrap">{String(request.description)}</p>
      <section className="mt-8">
        <h2 className="font-medium">История</h2>
        <ol className="mt-2 space-y-2 border-l-2 border-slate-200 pl-4 text-sm">
          {events.map((e, i) => (
            <li key={i}>
              <time className="text-slate-500">{new Date(e.createdAt).toLocaleString()}</time>
              <div>{e.type}</div>
            </li>
          ))}
        </ol>
      </section>
    </AppShell>
  );
}
