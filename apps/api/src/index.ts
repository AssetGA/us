import "./load-env.js";
import express, { type NextFunction, type Request, type Response } from "express";
import { getUploadsRoot } from "./lib/avatar.js";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { loadConfig } from "./config.js";
import { logEmailStartupStatus } from "./lib/mail.js";
import { connectDatabase } from "./db/connect.js";
import { attachUser } from "./middleware/context.js";
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import requestsRoutes from "./routes/requests.js";
import adminRoutes from "./routes/admin.js";
import categoriesRoutes from "./routes/categories.js";
import contractorsRoutes from "./routes/contractors.js";
import notificationsRoutes from "./routes/notifications.js";
import reportsRoutes from "./routes/reports.js";
import telegramRoutes from "./routes/telegram.js";
import publicRoutes from "./routes/public.js";
import { sendError } from "./lib/errors.js";

async function main() {
  const env = loadConfig();
  await logEmailStartupStatus(env);
  const { collections } = await connectDatabase(env);

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (origin === env.WEB_ORIGIN) {
          callback(null, true);
          return;
        }
        if (env.NODE_ENV !== "production") {
          const devOk =
            /^http:\/\/localhost:\d+$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
            /^http:\/\/\[::1\]:\d+$/.test(origin);
          if (devOk) {
            callback(null, true);
            return;
          }
        }
        callback(new Error(`CORS: origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: true,
    })
  );

  app.use((req, _res, next) => {
    req.appLocals = { env, collections };
    next();
  });
  app.use(attachUser);

  app.use("/uploads", express.static(getUploadsRoot()));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  const v1 = express.Router();
  v1.use("/public", publicRoutes);
  v1.use("/auth", authRoutes);
  v1.use("/users", usersRoutes);
  v1.use("/requests", requestsRoutes);
  v1.use("/admin", adminRoutes);
  v1.use("/categories", categoriesRoutes);
  v1.use("/contractors", contractorsRoutes);
  v1.use("/notifications", notificationsRoutes);
  v1.use("/reports", reportsRoutes);
  v1.use("/telegram", telegramRoutes);
  app.use("/api/v1", v1);

  app.use(
    (
      err: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      sendError(res, err);
    },
  );

  const server = app.listen(env.API_PORT, () => {
    console.info(`API listening on http://localhost:${env.API_PORT}`);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Порт ${env.API_PORT} уже занят. Остановите старый процесс API или задайте другой API_PORT в .env`,
      );
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
