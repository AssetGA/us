import { z } from "zod";

const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().default("mongodb://localhost:27017/service_desk"),
  MONGODB_USER: z.string().optional(),
  MONGODB_PASSWORD: z.string().optional(),
  MONGODB_AUTH_SOURCE: z.string().default("admin"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default("dev-session-secret-change-in-prod"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  /** @deprecated используйте SMTP_PASSWORD */
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  /** @deprecated используйте SMTP_FROM */
  EMAIL_FROM: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  /** Имя бота без @ — для ссылки t.me/... */
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE_NAME: z.string().optional(),
  WHATSAPP_OTP_TEMPLATE_LANGUAGE: z.string().default("ru"),
  WHATSAPP_DEFAULT_COUNTRY_CODE: z.string().default("7"),
  /** true — после регистрации можно сразу войти (удобно для локальной разработки) */
  AUTO_ACTIVATE_NEW_USERS: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof envSchema>;

export type LoadedConfig = Env & { mongodbUri: string };

/** Собирает URI с логином/паролем, если они заданы отдельно от MONGODB_URI */
export function resolveMongoUri(env: Env): string {
  const uri = env.MONGODB_URI.trim();
  const hasCredentialsInUri = /^mongodb(\+srv)?:\/\/[^/]+@/i.test(uri);
  if (hasCredentialsInUri) {
    return uri;
  }
  if (!env.MONGODB_USER || env.MONGODB_PASSWORD === undefined) {
    return uri;
  }
  const user = encodeURIComponent(env.MONGODB_USER);
  const pass = encodeURIComponent(env.MONGODB_PASSWORD);
  const prefix = uri.startsWith("mongodb+srv://")
    ? "mongodb+srv://"
    : "mongodb://";
  const rest = uri.slice(prefix.length);
  const authSource = env.MONGODB_AUTH_SOURCE;
  const withAuth = `${prefix}${user}:${pass}@${rest}`;
  if (withAuth.includes("authSource=")) {
    return withAuth;
  }
  const sep = withAuth.includes("?") ? "&" : "?";
  return `${withAuth}${sep}authSource=${encodeURIComponent(authSource)}`;
}

export function loadConfig(): LoadedConfig {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  const env = parsed.data;
  return { ...env, mongodbUri: resolveMongoUri(env) };
}
