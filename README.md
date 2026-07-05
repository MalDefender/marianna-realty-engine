# Марианна · Движок недвижимости

Полноценное приложение для риелтора: публичный сайт-каталог + **админ-панель**
с входом по паролю для публикации/редактирования/удаления объектов и загрузки
фотографий. Next.js 14 (App Router, TypeScript).

## Что умеет

- **Публичный сайт** — каталог объектов из базы, фильтр по типу, карточка объекта
  с деталями и фото, кнопка «Связаться».
- **Админ-панель** (`/admin`) — список объектов, создание/редактирование/удаление,
  загрузка нескольких фото, управление видимостью и порядком.
- **Хранилище** — Postgres в проде (Render/Neon) или локальный JSON для разработки
  (выбирается наличием `DATABASE_URL`). Фото хранятся в БД → не зависят от диска.

## Безопасность (что уже сделано)

- Пароль администратора хранится только как **bcrypt-хэш** (12 раундов).
- Сессия — подписанный **JWT в HttpOnly + Secure + SameSite cookie** (секрет в `AUTH_SECRET`).
- Все админ-роуты защищены дважды: middleware на `/admin/*` + `requireAdmin()` в каждом API.
- **Rate-limit** на логин (8 попыток / 10 мин на IP) против перебора.
- **CSRF**: проверка Origin на всех изменяющих запросах + SameSite-cookie.
- **Валидация входных данных** (zod) на логине и во всех операциях с объектами.
- **Загрузка фото** проверяется по magic-байтам (не по заявленному MIME), лимит 6 МБ,
  только JPEG/PNG/WebP.
- Параметризованные SQL-запросы (нет инъекций), UUID для id (нет обхода путей).
- **Security-заголовки**: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy. `X-Powered-By` отключён.

## Локальный запуск

```bash
npm install
cp .env.example .env        # заполни AUTH_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
npm run seed                # создаёт админа + 11 объектов (в data/db.json, т.к. DATABASE_URL пуст)
PORT=3399 npm run start     # или: npm run dev
```

- Сайт: `http://localhost:3399/`
- Панель: `http://localhost:3399/admin` (логин/пароль из `.env`)

`AUTH_SECRET` сгенерируй так: `openssl rand -base64 48`

## Деплой на Render (с постоянной базой)

Бесплатный веб-сервис Render не хранит файлы между перезапусками, поэтому база — внешний
Postgres (бесплатный **Neon** без срока годности, либо Render Postgres).

1. **Создай базу**: neon.tech → New Project → скопируй `Connection string` (это `DATABASE_URL`).
2. **Залей код в GitHub** (репозиторий уже готов, см. ниже) и в Render → **New → Web Service**,
   подключи репозиторий.
3. **Build Command**: `npm install && npm run build`
   **Start Command**: `npm run start`
4. **Environment** (вкладка Environment):
   - `DATABASE_URL` = строка подключения Neon
   - `AUTH_SECRET` = длинная случайная строка (`openssl rand -base64 48`)
   - `ADMIN_USERNAME` = логин Марианны
   - `ADMIN_PASSWORD` = надёжный пароль (нужен только для первичного сида)
   - `NEXT_PUBLIC_CONTACT_URL` = ссылка для кнопки «Связаться»
   - `NODE_VERSION` = `20` (стабильная LTS)
5. **Первичный сид**: один раз запусти в Render Shell `npm run seed` (создаст админа и
   объекты в Postgres). После этого `ADMIN_PASSWORD` можно удалить из окружения.

Домен подключается в настройках Render (Custom Domain) → у Марианны будет свой адрес.

## Замечания на будущее

- **Rate-limit** хранится в памяти инстанса. При масштабировании на несколько инстансов
  нужен общий стор (Redis).
- **Фото** лежат в БД (base64). Для больших объёмов позже стоит вынести в объектное
  хранилище (S3/R2/Supabase Storage) — код изолирован в `src/lib/db.ts` (`saveImage`/`getImage`).

## Структура

```
src/
  app/
    page.tsx              публичный сайт (сервер, читает БД)
    CatalogClient.tsx     каталог + модалка (клиент)
    admin/                панель: login, дашборд, new, edit/[id]
    api/                  login, logout, listings[CRUD], upload, image
  lib/
    db.ts                 слой хранилища (Postgres | JSON)
    auth.ts               bcrypt + JWT-сессии + guard + CSRF
    validation.ts         zod-схемы
    rateLimit.ts          лимит попыток логина
  middleware.ts           защита /admin/*
scripts/seed.mjs          создание админа + объектов
```
