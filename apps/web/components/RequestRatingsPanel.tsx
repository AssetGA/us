"use client";

import { useState } from "react";
import { StarRatingInput } from "@/components/StarRatingInput";

export type RequestRatingsState = {
  work: { score: number; comment?: string } | null;
  customerConduct: { score: number; comment?: string } | null;
  pendingKind: "work" | "customer_conduct" | null;
  bothSubmitted: boolean;
};

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-500" aria-label={`Оценка ${score} из 5`}>
      {"★".repeat(score)}
      {"☆".repeat(5 - score)}
    </span>
  );
}

function RatingForm({
  title,
  hint,
  starsLabel,
  allowComment,
  onSubmit,
}: {
  title: string;
  hint: string;
  starsLabel: string;
  allowComment: boolean;
  onSubmit: (score: number, comment?: string) => Promise<void>;
}) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score < 1) {
      setMsg("Выберите оценку от 1 до 5 звёзд");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      await onSubmit(score, allowComment ? comment.trim() || undefined : undefined);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-slate-600">{hint}</p>
      <StarRatingInput label={starsLabel} value={score} onChange={setScore} />
      {allowComment && (
        <label className="block text-sm">
          Комментарий (необязательно)
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxLength={2000}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      )}
      <button
        type="submit"
        disabled={saving || score < 1}
        className="rounded bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        {saving ? "Отправка…" : "Отправить оценку"}
      </button>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
    </form>
  );
}

export function RequestRatingsPanel({
  status,
  ratings,
  onSubmitRating,
}: {
  status: string;
  ratings: RequestRatingsState | null;
  onSubmitRating: (score: number, comment?: string) => Promise<void>;
}) {
  if (!ratings) return null;

  const showBlock = status === "completed" || status === "closed";
  if (!showBlock) return null;

  return (
    <section id="request-ratings" className="mt-6 space-y-4">
      <h2 className="font-medium">Взаимные оценки</h2>
      {status === "completed" && !ratings.bothSubmitted && (
        <p className="text-sm text-slate-600">
          После выполнения работ заказчик ставит оценку работе исполнителя (звёзды и при желании
          комментарий), исполнитель — лояльность заказчика только звёздами от 1 до 5. Заявка закроется,
          когда обе оценки будут отправлены.
        </p>
      )}

      {ratings.pendingKind === "work" && (
        <RatingForm
          title="Ваша оценка исполнителя"
          hint="Оцените качество выполненной работы."
          starsLabel="Оценка работы (1 — плохо, 5 — отлично)"
          allowComment
          onSubmit={onSubmitRating}
        />
      )}

      {ratings.pendingKind === "customer_conduct" && (
        <RatingForm
          title="Лояльность и отношение заказчика к исполнителю"
          hint="Оцените моральные качества заказчика и его отношение к вам как к исполнителю: уважение, честность, адекватность, готовность к диалогу. Только звёзды, без текста."
          starsLabel="Оценка от 1 до 5 звёзд"
          allowComment={false}
          onSubmit={onSubmitRating}
        />
      )}

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-white p-3 text-sm">
          <dt className="text-slate-500">Оценка работы исполнителя</dt>
          <dd className="mt-1">
            {ratings.work ? (
              <>
                <Stars score={ratings.work.score} />
                {ratings.work.comment && (
                  <p className="mt-1 text-slate-600">{ratings.work.comment}</p>
                )}
              </>
            ) : (
              <span className="text-slate-400">Ожидается</span>
            )}
          </dd>
        </div>
        <div className="rounded-lg border bg-white p-3 text-sm">
          <dt className="text-slate-500">Лояльность заказчика (отношение к исполнителю)</dt>
          <dd className="mt-1">
            {ratings.customerConduct ? (
              <Stars score={ratings.customerConduct.score} />
            ) : (
              <span className="text-slate-400">Ожидается</span>
            )}
          </dd>
        </div>
      </dl>

      {ratings.bothSubmitted && status === "closed" && (
        <p className="text-sm text-green-700">Обе оценки получены, заявка закрыта.</p>
      )}
    </section>
  );
}
