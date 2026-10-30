"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CREATE_REQUEST_VOICE_FIELDS,
  parseRequestVoiceTranscript,
} from "@service-desk/shared";
import { applyRequestVoiceFill } from "@/lib/apply-request-voice-fill";
import {
  createSpeechRecognition,
  speechRecognitionSupported,
  type BrowserSpeechRecognition,
  type SpeechRecognitionEvent,
} from "@/lib/speech-recognition";

const FIELD_HINT = CREATE_REQUEST_VOICE_FIELDS.flatMap(
  (def: (typeof CREATE_REQUEST_VOICE_FIELDS)[number]) => def.labels.slice(0, 2),
)
  .filter((v, i, a) => a.indexOf(v) === i)
  .slice(0, 12)
  .join(", ");

export function RequestVoiceFillPanel({
  formRef,
  categories,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
  categories: { id: string; name: string }[];
}) {
  const [supported] = useState(() => speechRecognitionSupported());
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [notice, setNotice] = useState("");
  const recRef = useRef<BrowserSpeechRecognition | null>(null);

  const stopListening = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function startListening() {
    setNotice("");
    const rec = createSpeechRecognition("ru-RU");
    if (!rec) {
      setNotice("Браузер не поддерживает распознавание речи (попробуйте Chrome).");
      return;
    }
    recRef.current = rec;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let chunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        chunk += ev.results[i]![0]!.transcript;
      }
      setTranscript((prev) => {
        const base = prev && !prev.endsWith("\n") ? `${prev} ` : prev;
        return (base + chunk).trimStart();
      });
    };
    rec.onerror = () => {
      setNotice("Ошибка микрофона или распознавания.");
      stopListening();
    };
    rec.onend = () => setListening(false);
    rec.start();
    setListening(true);
  }

  function applyToForm() {
    const form = formRef.current;
    if (!form) return;
    const parsed = parseRequestVoiceTranscript(transcript);
    const applied = applyRequestVoiceFill(form, parsed, categories);
    if (applied.length === 0) {
      setNotice(
        "Не удалось сопоставить поля. Называйте поле и значение, например: «заголовок: …», «описание: …».",
      );
      return;
    }
    setNotice(`Заполнено: ${applied.join(", ")}`);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h2 className="text-sm font-medium text-slate-800">Заполнение голосом</h2>
      <p className="mt-1 text-xs text-slate-600">
        {supported
          ? "Произнесите или введите пары «название поля: значение»."
          : "Микрофон недоступен в этом браузере — вставьте текст вручную."}{" "}
        Поля: {FIELD_HINT}…
      </p>
      <textarea
        value={transcript}
        onChange={(e) => setTranscript(e.target.value)}
        rows={4}
        className="mt-3 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        placeholder="Пример: заголовок: не работает принтер. описание: застряла бумага. филиал: офис на Абая."
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {supported &&
          (!listening ? (
            <button
              type="button"
              onClick={startListening}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
            >
              Начать диктовку
            </button>
          ) : (
            <button
              type="button"
              onClick={stopListening}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Остановить
            </button>
          ))}
        <button
          type="button"
          onClick={applyToForm}
          disabled={!transcript.trim()}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          Заполнить форму
        </button>
      </div>
      {listening && (
        <p className="mt-2 text-xs text-green-700">Идёт запись… говорите названия полей и значения.</p>
      )}
      {notice && <p className="mt-2 text-sm text-slate-700">{notice}</p>}
    </section>
  );
}
