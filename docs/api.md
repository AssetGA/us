# API v1

Базовый URL: `http://localhost:4000/api/v1`

Авторизация: cookie `sd_session` (httpOnly), credentials включены в CORS.

## Реализовано

- `POST /auth/register`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/verify-email`
- `GET /users/me`
- `GET|POST /requests`, `GET /requests/:id`, действия assign/accept/reject/start/complete/close/comments/events
- `GET /categories`, `GET /contractors` (диспетчер)
- `GET /notifications`, `POST /notifications/:id/read`
- `GET /reports/requests`
- `GET /admin/users`, `PATCH /admin/users/:id/status`, `POST /admin/categories`, `POST /admin/contractors`, `POST /admin/contractors/invite`
- `POST /telegram/link`, `/telegram/confirm-link`, `/telegram/webhook`

OpenAPI/Swagger — запланировано на следующий этап.
