# Service Desk

Внутренняя система заявок на ремонт и услуги: Next.js (web), Express + MongoDB (API), Telegram-бот (уведомления и привязка аккаунта).

## Структура

```
apps/web           — Next.js 15
apps/api           — REST API /api/v1
apps/telegram-bot  — Telegraf
packages/shared    — RBAC, Zod-схемы
docs/              — ТЗ, процессы, API
```

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d mongodb   # или укажите MONGODB_URI на ваш экземпляр MongoDB
pnpm install
pnpm --filter @service-desk/shared build
pnpm --filter @service-desk/api seed
pnpm dev:api   # терминал 1
pnpm dev:web   # терминал 2
```

Веб: http://localhost:3000  
API: http://localhost:4000/health  

Администратор после seed: `admin@company.local` / `Admin12345!`

### MongoDB: `Command createIndexes requires authentication`

Сервер MongoDB требует логин. В `.env` добавьте `MONGODB_USER`, `MONGODB_PASSWORD` и `MONGODB_AUTH_SOURCE` (см. `.env.example`) или полный `MONGODB_URI` с `user:password@...`.

Для **docker compose** из репозитория: `service_desk` / `service_desk_dev`, порт **27019** (на хосте; внутри контейнера 27017).  
Если контейнер создавался **без** root-пользователя, пересоздайте том: `docker compose down -v` (удалит данные БД), затем `docker compose up -d mongodb`.

## Что уже работает

- RBAC на сервере (`packages/shared`)
- Регистрация сотрудника, подтверждение email (в dev письмо в лог API), активация админом
- Вход по сессии (cookie), восстановление пароля
- CRUD-поток заявок: создание, очередь, назначение, accept/reject, complete, close, история событий
- Уведомления в БД (in-app)
- Приглашение подрядчика (admin), базовые отчёты
- Telegram: код привязки + бот `/link КОД`

## Следующие шаги (по ТЗ)

- Вложения (S3/MinIO) с проверкой доступа
- Push уведомлений в Telegram при событиях
- OpenAPI, интеграционные тесты (Vitest/Playwright)
- PATCH заявки, запрос доп. сведений, смета/валюта в UI
- Rate limit на auth, idempotency для создания заявок
