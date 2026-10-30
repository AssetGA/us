"use client";

import { useState } from "react";

export function RequestWorkConsentButton({
  currency,
  onConsent,
  onOpenDetails,
  hasPendingOffer,
}: {
  currency?: string;
  onConsent: () => Promise<void>;
  onOpenDetails?: () => void;
  hasPendingOffer?: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    setMsg("");
    try {
      await onConsent();
      setMsg("Согласие отправлено. Заказчик увидит вас в списке желающих выполнить заказ.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (hasPendingOffer) {
    return (
      <div className="mt-4 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
        Вы уже подтвердили согласие на выполнение. Ожидайте выбора заказчиком — контакты откроются
        после согласования.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-green-200 bg-green-50/60 p-4">
      <h3 className="font-medium">Согласие на выполнение работ</h3>
      <p className="text-sm text-slate-600">
        Нажмите кнопку ниже, чтобы заказчик увидел вас в списке исполнителей, готовых выполнить
        этот заказ. Телефон и email станут доступны обеим сторонам только после выбора вас
        заказчиком.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={confirm}
          className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Отправка…" : "Подтверждаю согласие выполнить работу"}
        </button>
        {onOpenDetails && (
          <button
            type="button"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50"
            onClick={onOpenDetails}
          >
            Уточнить сроки и цену ({currency ?? "KZT"})
          </button>
        )}
      </div>
      {msg && <p className="text-sm text-slate-700">{msg}</p>}
    </div>
  );
}
