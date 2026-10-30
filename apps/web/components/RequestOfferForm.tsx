"use client";

import { useState } from "react";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RequestOfferForm({
  validUntil,
  currency,
  onSubmit,
}: {
  validUntil?: string;
  currency?: string;
  onSubmit: (body: {
    message?: string;
    availableFrom: string;
    availableUntil: string;
    proposedPrice?: number;
  }) => Promise<void>;
}) {
  const startDefault = toLocalInputValue(new Date(Date.now() + 3600_000));
  const endDefault = toLocalInputValue(new Date(Date.now() + 86400_000));
  const [availableFrom, setAvailableFrom] = useState(startDefault);
  const [availableUntil, setAvailableUntil] = useState(endDefault);
  const [message, setMessage] = useState("");
  const [proposedPrice, setProposedPrice] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const fromIso = new Date(availableFrom).toISOString();
      const untilIso = new Date(availableUntil).toISOString();
      if (validUntil && new Date(untilIso) > new Date(validUntil)) {
        setMsg("Окончание работ не позже срока действия заявки");
        return;
      }
      const body: {
        message?: string;
        availableFrom: string;
        availableUntil: string;
        proposedPrice?: number;
      } = { availableFrom: fromIso, availableUntil: untilIso };
      if (message.trim()) body.message = message.trim();
      const price = proposedPrice.trim();
      if (price) body.proposedPrice = Number(price);
      await onSubmit(body);
      setMsg("Отклик отправлен заказчику");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-lg border border-green-200 bg-green-50/40 p-4">
      <h3 className="font-medium">Согласен выполнить работу</h3>
      <p className="text-sm text-slate-600">
        Укажите, когда вы готовы выполнить заказ. Заказчик выберет исполнителя из откликов.
      </p>
      {validUntil && (
        <p className="text-xs text-slate-500">
          Заявка активна до: {new Date(validUntil).toLocaleString("ru-RU")}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Начало выполнения
          <input
            type="datetime-local"
            required
            value={availableFrom}
            onChange={(e) => setAvailableFrom(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Окончание выполнения
          <input
            type="datetime-local"
            required
            value={availableUntil}
            onChange={(e) => setAvailableUntil(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </div>
      <label className="block text-sm">
        Ваша цена ({currency ?? "KZT"}, необязательно)
        <input
          type="number"
          min={0}
          step="0.01"
          value={proposedPrice}
          onChange={(e) => setProposedPrice(e.target.value)}
          className="mt-1 w-40 rounded border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Комментарий
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Отправка…" : "Отправить отклик"}
      </button>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </form>
  );
}
