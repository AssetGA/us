import { REQUEST_PRIORITIES } from "./schemas/request.js";

type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

/** Поля формы создания заявки (имена совпадают с `name` в HTML и ключами API). */
export type RequestVoiceFillField =
  | "title"
  | "description"
  | "categoryName"
  | "site"
  | "address"
  | "floor"
  | "room"
  | "proposedPrice"
  | "currency"
  | "priority"
  | "validUntil";

export type RequestVoiceFillResult = Partial<
  Record<RequestVoiceFillField, string> & { proposedPrice: string }
>;

/** Подписи и синонимы для озвучивания — сопоставляются с полями формы. */
export const CREATE_REQUEST_VOICE_FIELDS: readonly {
  field: RequestVoiceFillField;
  labels: readonly string[];
}[] = [
  { field: "title", labels: ["заголовок", "title", "тема", "название"] },
  { field: "description", labels: ["описание", "description", "детали", "суть"] },
  { field: "categoryName", labels: ["категория", "category", "вид работ", "услуга"] },
  { field: "site", labels: ["филиал", "объект", "site", "локация", "место"] },
  { field: "address", labels: ["адрес", "address"] },
  { field: "floor", labels: ["этаж", "floor"] },
  { field: "room", labels: ["кабинет", "комната", "помещение", "room"] },
  {
    field: "proposedPrice",
    labels: ["цена", "стоимость", "proposedprice", "proposed price", "ориентировочная цена", "бюджет"],
  },
  { field: "currency", labels: ["валюта", "currency"] },
  { field: "priority", labels: ["приоритет", "priority", "срочность"] },
  {
    field: "validUntil",
    labels: ["срок действия", "validuntil", "valid until", "принимать отклики до", "до даты"],
  },
];

const PRIORITY_ALIASES: Record<string, RequestPriority> = {
  low: "low",
  низкий: "low",
  низкая: "low",
  normal: "normal",
  обычный: "normal",
  обычная: "normal",
  средний: "normal",
  high: "high",
  высокий: "high",
  высокая: "high",
  urgent: "urgent",
  срочный: "urgent",
  срочная: "urgent",
  срочно: "urgent",
};

const CURRENCY_ALIASES: Record<string, string> = {
  kzt: "KZT",
  тенге: "KZT",
  тг: "KZT",
  rub: "RUB",
  руб: "RUB",
  рубль: "RUB",
  рублей: "RUB",
  usd: "USD",
  dollar: "USD",
  dollars: "USD",
  доллар: "USD",
  долларов: "USD",
};

type AliasEntry = { field: RequestVoiceFillField; alias: string };

function buildAliasIndex(): AliasEntry[] {
  const entries: AliasEntry[] = [];
  for (const { field, labels } of CREATE_REQUEST_VOICE_FIELDS) {
    for (const label of labels) {
      entries.push({ field, alias: label.toLowerCase() });
    }
  }
  return entries.sort((a, b) => b.alias.length - a.alias.length);
}

const ALIAS_INDEX = buildAliasIndex();

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function resolveFieldFromLabel(rawLabel: string): RequestVoiceFillField | null {
  const label = normalizeSpaces(rawLabel.toLowerCase());
  for (const { field, alias } of ALIAS_INDEX) {
    if (label === alias || label.startsWith(`${alias} `)) return field;
  }
  return null;
}

function splitLabelValue(line: string): { label: string; value: string } | null {
  const m = line.match(/^(.+?)\s*(?:[:：]|—|-|=)\s*(.+)$/);
  if (!m) return null;
  return { label: m[1]!.trim(), value: m[2]!.trim() };
}

function setField(result: RequestVoiceFillResult, field: RequestVoiceFillField, value: string): void {
  const v = normalizeSpaces(value);
  if (!v) return;
  if (field === "description" && result.description) {
    result.description = `${result.description}\n${v}`;
    return;
  }
  result[field] = v;
}

function normalizeFieldValue(field: RequestVoiceFillField, raw: string): string {
  const v = normalizeSpaces(raw);
  if (field === "priority") {
    const key = v.toLowerCase();
    return PRIORITY_ALIASES[key] ?? v;
  }
  if (field === "currency") {
    const key = v.toLowerCase().replace(/\./g, "");
    return CURRENCY_ALIASES[key] ?? v.toUpperCase().slice(0, 3);
  }
  if (field === "proposedPrice") {
    const digits = v.replace(/[^\d.,]/g, "").replace(",", ".");
    return digits || v;
  }
  return v;
}

/** Разбор текста диктовки: значения распределяются по полям по названиям/синонимам. */
export function parseRequestVoiceTranscript(text: string): RequestVoiceFillResult {
  const result: RequestVoiceFillResult = {};
  const trimmed = text.trim();
  if (!trimmed) return result;

  scanInlineLabels(trimmed, result);

  const lines = trimmed.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const pair = splitLabelValue(line);
    if (!pair) continue;
    const field = resolveFieldFromLabel(pair.label);
    if (field && result[field] === undefined) {
      setField(result, field, normalizeFieldValue(field, pair.value));
    }
  }

  if (!result.title && !result.description) {
    assignFallbackFreeText(trimmed, result);
  }

  for (const key of Object.keys(result) as RequestVoiceFillField[]) {
    const raw = result[key];
    if (raw !== undefined) result[key] = normalizeFieldValue(key, raw);
  }

  if (result.priority && !REQUEST_PRIORITIES.includes(result.priority as RequestPriority)) {
    const mapped = PRIORITY_ALIASES[result.priority.toLowerCase()];
    if (mapped) result.priority = mapped;
  }

  return result;
}

function scanInlineLabels(text: string, result: RequestVoiceFillResult): void {
  const labelPattern = ALIAS_INDEX.map((e) =>
    e.alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  ).join("|");
  if (!labelPattern) return;

  const re = new RegExp(
    `(?:^|[\\n.;]\\s*)(${labelPattern})\\s*(?:[:：]|—|-|=)\\s*`,
    "gi",
  );
  const matches: { index: number; field: RequestVoiceFillField; valueStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const field = resolveFieldFromLabel(m[1]!);
    if (!field) continue;
    matches.push({ index: m.index, field, valueStart: m.index + m[0].length });
  }
  matches.sort((a, b) => a.index - b.index);

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]!;
    const end = i + 1 < matches.length ? matches[i + 1]!.index : text.length;
    let value = text.slice(cur.valueStart, end).trim();
    value = value.replace(/^[,.\s]+|[,.\s]+$/g, "");
    if (!result[cur.field]) {
      setField(result, cur.field, normalizeFieldValue(cur.field, value));
    }
  }
}

function assignFallbackFreeText(text: string, result: RequestVoiceFillResult): void {
  const oneLine = normalizeSpaces(text.replace(/\n+/g, " "));
  const dot = oneLine.indexOf(". ");
  if (dot > 3 && dot < 120) {
    result.title = oneLine.slice(0, dot).trim();
    result.description = oneLine.slice(dot + 1).trim();
    return;
  }
  if (oneLine.length <= 120) {
    result.title = oneLine;
    result.description = oneLine.length >= 10 ? oneLine : `${oneLine}. Уточните описание вручную.`;
    return;
  }
  result.title = oneLine.slice(0, 120).trim();
  result.description = oneLine;
}
