import type { Env } from "../config.js";
import { isValidWhatsAppPhone } from "./phone.js";

type WhatsAppEnv = Pick<
  Env,
  | "WHATSAPP_ACCESS_TOKEN"
  | "WHATSAPP_PHONE_NUMBER_ID"
  | "WHATSAPP_OTP_TEMPLATE_NAME"
  | "WHATSAPP_OTP_TEMPLATE_LANGUAGE"
>;

export async function sendWhatsAppRegistrationCode(
  env: WhatsAppEnv,
  phoneDigits: string,
  code: string,
  verifyUrl: string,
): Promise<void> {
  if (!isValidWhatsAppPhone(phoneDigits)) {
    throw new Error("Invalid phone for WhatsApp");
  }

  const text = `Service Desk: код подтверждения регистрации — ${code}. Действует 15 минут. Введите на сайте: ${verifyUrl}`;

  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    console.info(`[whatsapp] To: +${phoneDigits}\n${text}`);
    return;
  }

  const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const headers = {
    Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (env.WHATSAPP_OTP_TEMPLATE_NAME) {
    const body = {
      messaging_product: "whatsapp",
      to: phoneDigits,
      type: "template",
      template: {
        name: env.WHATSAPP_OTP_TEMPLATE_NAME,
        language: { code: env.WHATSAPP_OTP_TEMPLATE_LANGUAGE ?? "ru" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
        ],
      },
    };
    const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[whatsapp] template send failed:", errText);
      throw new Error("Не удалось отправить код в WhatsApp");
    }
    return;
  }

  const body = {
    messaging_product: "whatsapp",
    to: phoneDigits,
    type: "text",
    text: { body: text },
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const errText = await res.text();
    console.error("[whatsapp] text send failed:", errText);
    throw new Error(
      "Не удалось отправить код в WhatsApp. Настройте шаблон WHATSAPP_OTP_TEMPLATE_NAME для production.",
    );
  }
}
