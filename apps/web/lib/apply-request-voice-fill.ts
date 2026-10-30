import type { RequestVoiceFillResult } from "@service-desk/shared";

function isoToDatetimeLocal(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseValidUntilLocal(raw: string): string | null {
  const trimmed = raw.trim();
  const fromIso = isoToDatetimeLocal(trimmed);
  if (fromIso) return fromIso;
  const m = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]) - 1;
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  const hour = m[4] !== undefined ? Number(m[4]) : 23;
  const minute = m[5] !== undefined ? Number(m[5]) : 59;
  const d = new Date(year, month, day, hour, minute);
  if (Number.isNaN(d.getTime())) return null;
  return isoToDatetimeLocal(d.toISOString());
}

function setControlValue(form: HTMLFormElement, name: string, value: string): boolean {
  const el = form.elements.namedItem(name);
  if (!el) return false;
  if (el instanceof RadioNodeList) return false;
  if ("value" in el) {
    (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  return false;
}

/** Заполняет форму заявки по результатам разбора диктовки. */
export function applyRequestVoiceFill(
  form: HTMLFormElement,
  parsed: RequestVoiceFillResult,
  categories: { id: string; name: string }[],
): string[] {
  const applied: string[] = [];

  const trySet = (name: string, value: string | undefined) => {
    if (!value) return;
    if (setControlValue(form, name, value)) applied.push(name);
  };

  trySet("title", parsed.title);
  trySet("description", parsed.description);
  trySet("site", parsed.site);
  trySet("address", parsed.address);
  trySet("floor", parsed.floor);
  trySet("room", parsed.room);
  trySet("proposedPrice", parsed.proposedPrice);
  trySet("currency", parsed.currency);
  trySet("priority", parsed.priority);

  if (parsed.validUntil) {
    const local = parseValidUntilLocal(parsed.validUntil) ?? parsed.validUntil;
    trySet("validUntil", local);
  }

  if (parsed.categoryName) {
    const q = parsed.categoryName.toLowerCase();
    const match = categories.find(
      (c) =>
        c.name.toLowerCase() === q ||
        c.name.toLowerCase().includes(q) ||
        q.includes(c.name.toLowerCase()),
    );
    if (match && setControlValue(form, "categoryId", match.id)) {
      applied.push("categoryId");
    }
  }

  return applied;
}
