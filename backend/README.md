# IssueTracker API (Go)

chi · pgx v5 · sqlc · PostgreSQL 16 · файлы на диске или в S3 (minio-go) · JWT (golang-jwt) · bcrypt · OAuth 2.0 на стандартной библиотеке.

## Структура

```
cmd/api/main.go                  точка входа: конфиг, БД, миграции, S3, HTTP-сервер, graceful shutdown
internal/
  config/                        переменные окружения
  database/
    migrations/                  схема БД (применяется при старте, учёт в schema_migrations)
      0001_init.sql              пользователи, проекты, команды, задачи, вложения, документы
      0002_user_avatar.sql       загруженные аватары
      0003_planning.sql          иерархия, спринты, версии, учёт времени, комментарии, наблюдатели, уведомления, Telegram
    queries/*.sql                SQL-запросы для sqlc
    db/                          код, сгенерированный sqlc (не править руками — make sqlc)
    postgres.go                  подключение и мигратор
  auth/                          пароли (bcrypt), JWT/refresh-токены, OAuth Google/GitHub
  storage/                       хранилище файлов: local (диск) или s3
  telegram/                      клиент Telegram Bot API (long polling, без вебхука)
  httpapi/
    server.go                    маршруты
    middleware.go                логирование, CORS, CSRF-проверка Origin, авторизация, доступ к проекту и роли
    auth.go users.go             регистрация, вход, refresh, OAuth, профиль
    projects.go teams.go         проекты, участники, приглашения, команды
    issues.go files.go docs.go   задачи + история + иерархия, вложения, документы
    collab.go                    комментарии, наблюдатели, учёт времени
    planning.go                  спринты (+ burndown), версии
    notify.go                    @упоминания, уведомления, Telegram (привязка /start <код>)
    avatar.go                    фото профиля
    dto.go respond.go            форматы ответов и ошибок
    openapi.yaml                 спецификация (Swagger UI: /api/docs)
```

## Команды

```bash
go mod tidy     # первый раз
make run        # запуск с переменными из .env
make sqlc       # после правки queries/*.sql или миграций
make infra      # docker compose up -d postgres
```

Новая миграция — файл `internal/database/migrations/0004_<что-то>.sql`; применится при следующем старте.

## Безопасность

- Пароли — bcrypt (cost 12); при входе с несуществующим email время ответа такое же.
- Access-токен — JWT HS256 на 15 минут в httpOnly-cookie `it_access` (Path=/api).
- Refresh-токен — 32 случайных байта в cookie `it_refresh` (Path=/api/auth), в БД только SHA-256; при каждом обновлении старый отзывается (ротация).
- CSRF: SameSite=Lax + изменяющие запросы принимаются только с разрешённых `Origin` (ALLOWED_ORIGINS).
- Доступ к проекту проверяется на каждом запросе; чужой проект отвечает 404.
- Файлы: тип картинок определяется по содержимому; документы отдаются с `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, SVG/HTML — только скачиванием.
- Целостность данных обеспечивает БД: составные внешние ключи не дают назначить исполнителем или добавить в команду человека не из проекта.

## Эндпоинты

Полный список с примерами — Swagger: http://localhost:8080/api/docs. Кратко:

| Метод | Путь | Роль |
|---|---|---|
| POST | /api/auth/register, /login, /refresh, /logout | — |
| GET | /api/auth/me, /api/auth/oauth/{google\|github} | — |
| PATCH | /api/users/me · POST /users/me/password · DELETE /users/me/providers/{p} | вошедший |
| GET, POST | /api/projects | вошедший |
| GET, PATCH, DELETE | /api/projects/{id} | viewer / admin / owner |
| GET, POST, PATCH, DELETE | /api/projects/{id}/members[/{userId\|me}], /invites/{id} | admin (выйти — любой) |
| GET, POST, PATCH, DELETE | /api/projects/{id}/teams[/{teamId}[/members[/{userId}]]] | просмотр — все, изменение — admin |
| GET, POST, PATCH, DELETE | /api/projects/{id}/issues[/{issueId}] | просмотр — все, изменение — member |
| GET | /api/projects/{id}/issues/{issueId}/events | все |
| POST, DELETE | /api/projects/{id}/issues/{issueId}/attachments[/{attId}] | member |
| GET | /api/projects/{id}/attachments/{attId}/content | все |
| GET, POST, PATCH, DELETE | /api/projects/{id}/docs[/{docId}], POST /docs/links | просмотр — все, изменение — member |
| GET | /api/projects/{id}/docs/{docId}/content[?download=1] | все |
| PUT, DELETE | /api/projects/{id}/issues/{issueId}/watchers/me | все участники |
| GET, POST | /api/projects/{id}/issues/{issueId}/comments · PATCH, DELETE /comments/{commentId} | просмотр — все, писать — member, править — автор |
| GET, POST | /api/projects/{id}/issues/{issueId}/worklogs · DELETE /worklogs/{id} · GET /time-report | просмотр — все, списывать — member |
| GET, POST, PATCH, DELETE | /api/projects/{id}/sprints[/{sprintId}] · POST …/start, …/complete · GET …/burndown | просмотр — все, изменение — member |
| GET, POST, PATCH, DELETE | /api/projects/{id}/versions[/{versionId}] | просмотр — все, изменение — member |
| GET | /api/notifications · POST /api/notifications/read | вошедший |
| GET, POST, PATCH, DELETE | /api/users/me/telegram[/link] | вошедший |
| POST, DELETE | /api/users/me/avatar · GET /api/users/{id}/avatar | вошедший |
| GET | /health | — |
