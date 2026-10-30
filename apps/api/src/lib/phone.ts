/** Приводит ввод к цифрам для WhatsApp Cloud API (без +). */
export function normalizePhoneDigits(raw: string, defaultCountry = "7"): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("8") && digits.length === 11) {
    digits = `7${digits.slice(1)}`;
  }
  if (digits.length === 10 && defaultCountry) {
    digits = `${defaultCountry}${digits}`;
  }
  return digits;
}

export function isValidWhatsAppPhone(digits: string): boolean {
  return digits.length >= 10 && digits.length <= 15;
}
