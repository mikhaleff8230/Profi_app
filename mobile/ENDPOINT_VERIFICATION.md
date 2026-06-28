# Отчёт проверки endpoints (2026-06-28)

**Окружение:** `EXPO_PUBLIC_API_URL=http://127.0.0.1:8001` (без `/api`)

**Статус запуска API:** Laravel на `127.0.0.1:8001` во время проверки **не отвечал** (curl exit 7). Ниже — ожидаемые URL после деплоя/запуска `php artisan serve` и маршрутизации с префиксом `/api/proffi`.

## Public

| Endpoint | Ожидание | Результат проверки |
|----------|----------|-------------------|
| GET /api/proffi/categories | 200 + JSON array | Не проверено (API offline) |
| GET /api/proffi/stories | 200 + JSON array | Не проверено |
| GET /api/proffi/tasks | 200 + JSON array | Не проверено |
| GET /api/proffi/tasks?category_id=... | фильтр категории | Не проверено |
| GET /api/proffi/tasks?q=... | поиск | Не проверено |
| GET /api/proffi/tasks?city=... | фильтр города | Не проверено |
| GET /api/proffi/tasks?sw_lat&sw_lng&ne_lat&ne_lng | bbox + только с координатами | Реализовано в TaskController |
| GET /api/proffi/tasks/{id} | 200 + task | Не проверено |
| GET /api/proffi/specialists | 200 | Не проверено |
| GET /api/proffi/specialists/{id} | 200 | Не проверено |
| GET /api/proffi/specialists/{id}/reviews | 200 | Не проверено |

## Auth (требует Bearer token)

| Endpoint | Результат |
|----------|-----------|
| GET /api/proffi/auth/me | Не проверено |
| PATCH/POST /api/proffi/auth/profile | Не проверено |
| GET /api/proffi/auth/stats | Не проверено |

## Customer / Specialist / Chats

Все пути переведены в mobile на `/api/proffi/*` через `apiFetch()`. Live-проверка не выполнена без токена и запущенного API.

## Geo (root namespace)

| Endpoint | Mobile namespace |
|----------|------------------|
| GET /api/geo/detect | `root` |
| GET /api/geo/reverse | `root` |
| GET /api/addresses/search | `root` |
| POST /api/address/save | `root` |

## Как повторить проверку локально

```bash
cd pixer-api && php artisan serve --port=8001
curl.exe http://127.0.0.1:8001/api/proffi/categories
curl.exe "http://127.0.0.1:8001/api/proffi/tasks?sw_lat=55.7&sw_lng=37.5&ne_lat=55.8&ne_lng=37.7"
```

## Известные ограничения

- Shop rewrite `/api/treabo/*` → `/api/*` не совпадает с новым префиксом `/api/proffi/*` (shop не менялся по ТЗ).
- Скриншоты UI не приложены: требуется ручной прогон `expo start` с ключом `EXPO_PUBLIC_YANDEX_MAPS_API_KEY` и рабочим API.
