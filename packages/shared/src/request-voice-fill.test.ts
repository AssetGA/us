import { describe, it, expect } from "vitest";
import { parseRequestVoiceTranscript } from "./request-voice-fill.js";

describe("parseRequestVoiceTranscript", () => {
  it("maps Russian labels to form fields", () => {
    const r = parseRequestVoiceTranscript(`
заголовок: сломан кондиционер
описание: не включается, нужен мастер
филиал: главный офис
адрес: ул. Абая 10
этаж: 3
кабинет: 401
категория: кондиционирование
приоритет: срочный
цена: 25000
валюта: тенге
`);
    expect(r.title).toBe("сломан кондиционер");
    expect(r.description).toContain("не включается");
    expect(r.site).toBe("главный офис");
    expect(r.address).toBe("ул. Абая 10");
    expect(r.floor).toBe("3");
    expect(r.room).toBe("401");
    expect(r.categoryName).toBe("кондиционирование");
    expect(r.priority).toBe("urgent");
    expect(r.proposedPrice).toBe("25000");
    expect(r.currency).toBe("KZT");
  });

  it("supports English field names", () => {
    const r = parseRequestVoiceTranscript("title: Fix printer\ndescription: Paper jam on floor 2");
    expect(r.title).toBe("Fix printer");
    expect(r.description).toBe("Paper jam on floor 2");
  });

  it("parses inline labeled speech", () => {
    const r = parseRequestVoiceTranscript(
      "заголовок: протечка. описание: капает под раковиной. филиал: склад",
    );
    expect(r.title).toBe("протечка");
    expect(r.description).toContain("капает");
    expect(r.site).toBe("склад");
  });
});
