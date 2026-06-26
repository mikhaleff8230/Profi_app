# Proffi Laravel Integration Status

Date: 2026-06-03

## Decisions

1. Proffi `specialist` maps to Marvel `store_owner`.
2. Proffi tasks are stored in dedicated tables, not Marvel ecommerce orders.
3. Proffi chats are stored in dedicated tables, not Marvel shop conversations.
4. Existing database is reused; Proffi migration only adds columns/tables.
5. PHP/Composer are not installed locally. Docker profile is used for Laravel, Composer, MySQL, and Redis.

## Implemented Files

- `pixer-api/routes/proffi.php`
- `pixer-api/database/migrations/2026_06_03_000001_create_proffi_tables.php`
- `pixer-api/app/Models/ProffiCategory.php`
- `pixer-api/app/Models/ProffiFilter.php`
- `pixer-api/app/Models/ProffiTask.php`
- `pixer-api/app/Models/ProffiApplication.php`
- `pixer-api/app/Models/ProffiChat.php`
- `pixer-api/app/Models/ProffiMessage.php`
- `pixer-api/app/Http/Controllers/Proffi/AuthController.php`
- `pixer-api/app/Http/Controllers/Proffi/CategoryController.php`
- `pixer-api/app/Http/Controllers/Proffi/TaskController.php`
- `pixer-api/app/Http/Controllers/Proffi/ApplicationController.php`
- `pixer-api/app/Http/Controllers/Proffi/ChatController.php`
- `pixer-api/app/Http/Controllers/Proffi/SpecialistController.php`
- `pixer-api/app/Http/Controllers/Proffi/UploadController.php`
- `pixer-api/app/Http/Controllers/Proffi/AdminController.php`
- `pixer-api/app/Http/Middleware/ProffiAdminToken.php`
- `pixer-api/packages/marvel/src/Database/Models/Profile.php`
- `pixer-api/Dockerfile.proffi`
- `pixer-api/docker-compose.proffi.yml`
- `pixer-api/.env.proffi-docker`
- `pixer-api/.env.original-local`
- `mobile/.env`
- `mobile/.env.example`

`pixer-api/routes/api.php` now requires `routes/proffi.php`, so current clients can keep using `/api/...`.

## Covered Endpoint Groups

- Auth: `/api/auth/check-phone`, `/api/auth/register-phone`, `/api/auth/register`, `/api/auth/login`, `/api/auth/verify`, `/api/auth/me`, `/api/auth/stats`, `/api/auth/profile`
- Public data: `/api/proffi-health`, `/api/categories`, `/api/stories`, `/api/files/{path}`
- Tasks/applications: `/api/tasks`, `/api/tasks/mine`, `/api/tasks/{task}`, `/api/tasks/{task}/applications`, `/api/applications/mine`, `/api/applications/{application}/accept`, `/api/tasks/{task}/specialist-info`
- Chats: `/api/chats`, `/api/chats/{chat}`, `/api/chats/{chat}/messages`
- Specialists: `/api/specialists`, `/api/specialists/{user}`
- Uploads: `/api/uploads`
- Admin: `/api/admin/stats`, `/api/admin/users`, `/api/admin/categories`, `/api/admin/filters`

## Docker Local Run

Start Docker Desktop first, then run:

```bash
cd C:\Proffi\project\pixer-api
docker compose -f docker-compose.proffi.yml up -d --build
```

Expected API URL:

```text
http://127.0.0.1:8001
```

Local admin token:

```text
X-Admin-Token: admin
```

The compose profile imports `backup_before_migration.sql` into MySQL on the first run of the `proffi_mysql` volume, then runs Composer install and Laravel migrations.

Current local `.env` is copied from `.env.proffi-docker` so Laravel HTTP requests use Docker networking (`DB_HOST=mysql`) instead of the old production-like `.env` values (`DB_HOST=localhost`, Redis cache/session). The previous `.env` was saved as `.env.original-local`.

For local API smoke tests, API throttle middleware is disabled in `app/Http/Kernel.php` because the original project path tried to use `phpredis` during HTTP requests. Local cache/session are file-based and `REDIS_CLIENT=predis`.

## Verification Status

Done:

- Docker Desktop is running.
- `mysql`, `redis`, and `app` containers are up.
- Composer install completed inside Docker.
- Laravel migrations completed; Proffi tables migration is applied.
- Laravel server is running on `http://127.0.0.1:8001`.
- `packages/marvel/src/Database/Repositories/ProductRepository.php` had a syntax error from a duplicated legacy tail; it was repaired and `php -l` reports no syntax errors.
- Storage/cache directories are created before Laravel boots.
- GitHub DNS/codeload hosts and Composer timeout are configured in compose to avoid dependency install stalls.
- API smoke tests pass:
- Frontend TypeScript check passes:

```bash
cd C:\Proffi\project\mobile
.\node_modules\.bin\tsc.cmd --noEmit
```

- Mobile/web frontend is configured for local Laravel API:

```text
EXPO_PUBLIC_API_URL=http://127.0.0.1:8001
EXPO_PUBLIC_SKIP_AUTH=0
```

- Frontend demo fallbacks were removed from real marketplace flows:
  - auth no longer skips login by default in dev;
  - task list uses `/api/tasks` result directly, including an empty list;
  - create task shows Laravel errors instead of opening a demo order;
  - task detail shows API errors instead of loading a demo task;
  - chat service uses Laravel chat API instead of local SQLite/web demo fallback.

- Public task/specialist routes were moved outside auth while protected task routes remain authenticated:
  - `GET /api/tasks`
  - `GET /api/tasks/{task}`
  - `GET /api/specialists`
  - `GET /api/specialists/{user}`

- Route conflict check passes:

```bash
curl -H "Accept: application/json" http://127.0.0.1:8001/api/tasks/mine
```

Response:

```text
401 Unauthorized
{"message":"Unauthenticated."}
```

- API smoke tests pass:
- Auth/task frontend integration smoke test passes:
  - `Profile` now casts `proffi_services` as JSON, so phone registration no longer fails with `Array to string conversion`.
  - `POST /api/auth/register-phone` returns a Sanctum token and mapped Proffi user.
  - `POST /api/tasks` creates a task with the returned token.
  - `GET /api/tasks` returns the created task.
  - Expo web at `http://127.0.0.1:8082` logs in through the UI with a phone/password user and shows the Laravel-created task on the home screen.

- Application/chat API smoke test passes:
  - customer registers and creates a task;
  - specialist registers and applies to that task;
  - customer accepts the application;
  - `/api/applications/{application}/accept` creates a `proffi_chats` row and returns `chat_id`;
  - customer sends a chat message;
  - specialist can read the message from `/api/chats/{chat}/messages`.

- Auth startup and role logic checked:
  - app starts in `AuthProvider`, tries saved token via `/api/auth/me`, and opens the logged-in stack when the token is valid;
  - without a user, `RootNavigator` opens `Welcome`;
  - `Welcome` passes `role: "specialist"` from "Хочу войти и выполнить заказ" and `role: "customer"` from "Хочу заказать услугу";
  - phone flow checks `/api/auth/check-phone`;
  - registered phone goes to password login and backend role wins after `/api/auth/login`;
  - new phone goes through email/password registration and sends the selected role to `/api/auth/register-phone`;
  - API smoke test confirms customer registration returns `customer`, specialist registration returns `specialist`, and `/api/auth/me` preserves the same role.

- Profile/logout/statistics fixes:
  - profile logout now has an accessible label and uses browser `confirm` on web before clearing the token;
  - customer stats now support both `open_tasks` and `open`;
  - backend `/api/auth/stats` now returns `open`, `open_tasks`, and `in_progress` for customer users.

- Yandex Maps integration started:
  - installed `react-native-webview` for Expo-friendly native map rendering;
  - added `EXPO_PUBLIC_YANDEX_MAPS_API_KEY` to `mobile/.env` and `.env.example`;
  - added shared Yandex Maps HTML/point builder in `mobile/src/maps/yandexMapHtml.ts`;
  - native `MapScreen.tsx` renders Yandex Maps JS API inside `WebView`;
  - web `MapScreen.web.tsx` loads Yandex Maps JS API directly into the DOM;
  - both versions use Laravel task coordinates, show map markers, and open the bottom task card on marker selection;
  - without a Yandex key, both versions show a clear setup message instead of a blank map.
  - local Yandex/DaData env values were added to ignored env files only (`mobile/.env`, `pixer-api/.env`, `pixer-api/.env.proffi-docker`);
  - web map was verified with the local Yandex key: the setup message disappeared and Yandex Maps loaded without console errors;
  - created a local smoke-test task with coordinates near Moscow to verify map marker data flow;
  - map counters now show tasks with coordinates, matching the visible marker count.

- Docker app startup was optimized for local reboot recovery:

```yaml
test -f vendor/autoload.php || composer install --no-interaction --prefer-dist --no-dev
```

This avoids running Composer on every container start when dependencies already exist.

- API smoke tests pass:

```bash
curl http://127.0.0.1:8001/api/proffi-health
curl http://127.0.0.1:8001/api/categories
curl -H "X-Admin-Token: admin" http://127.0.0.1:8001/api/admin/stats
```

Observed smoke-test responses:

- `/api/proffi-health`: `200 OK`, `db_host=mysql`, `cache=file`, `redis_client=predis`
- `/api/categories`: `200 OK`, returns category list mapped for Proffi
- `/api/admin/stats`: `200 OK`, returns counts such as users/categories/filters/tasks

Useful commands:

```bash
docker compose -f docker-compose.proffi.yml ps
docker compose -f docker-compose.proffi.yml logs -f app
```

## Marvel Route Audit

Checked `pixer-api/packages/marvel/src/Rest/Routes.php`.

Findings:

- Marvel `RestApiServiceProvider` loads `Rest/Routes.php` directly with no global `/api` prefix.
- `RouteServiceProvider` loads `routes/api.php` with `/api` prefix, so Proffi routes in `routes/proffi.php` are exposed as `/api/...`.
- Marvel has root-level marketplace routes such as `/register`, `/token`, `/categories`, `/attachments`, `/me`, `/chat/conversations`, `/messages/conversations/{id}`.
- Marvel has one nested `Route::prefix('api')` block, but it only covers product/element compatibility routes like `/api/products/{id}/attributes` and `/api/element/{slugId}`.
- No Marvel routes were found for Proffi paths: `/api/tasks`, `/api/chats`, `/api/applications`, `/api/specialists`, `/api/stories`, `/api/uploads`, `/api/files`.
- Existing `routes/api.php` has a separate `/api/admin` group for payment/billing routes, but not `/api/admin/stats`, `/api/admin/users`, `/api/admin/categories`, or `/api/admin/filters`.

Fix applied:

- Removed direct `Marvel\Providers\RestApiServiceProvider::class` from `config/app.php` because `Marvel\ShopServiceProvider` already registers it. This prevents double loading of Marvel `Rest/Routes.php`.
