# ТЗ для Cursor: синхронизация мобильного приложения Treabo с web/admin/API

Дата: 2026-06-28

## Контекст

Mobile-приложение в `mobile/` должно быть совместимо с почти готовым web-фронтом `shop/` и Laravel API/admin в `pixer-api/`.

Главное изменение на web: режим карты заданий больше не popup. На странице заданий используется список + карта, список фильтруется по видимой области карты, fullscreen показывает sidebar со списком и карту на оставшейся области. В mobile нужно привести поведение к той же модели: карта и список должны быть связаны, маркеры показывают понятные плашки заданий, pan/zoom карты обновляет список заданий.

Деплой не делать.

## Важное ограничение

Не переписывать приложение целиком и не ломать существующий UI без необходимости. Работать точечно:
- mobile API namespace и контракты;
- задания/карта/гео/фильтры;
- страница задания;
- чаты;
- страницы мастера;
- production-поведение без демо-фолбэков.

Не трогать несвязанные web/shop правки, кроме чтения как эталона.

## Текущие расхождения

1. Mobile ходит в старые endpoints:
   - сейчас: `/api/tasks`, `/api/categories`, `/api/chats`, `/api/auth/me` и т.п.;
   - актуальный Proffi/Treabo API подключён в `pixer-api/routes/proffi.php` и должен использовать prefix `/api/proffi`.

2. Актуальные endpoints:
   - `GET /api/proffi/categories`
   - `GET /api/proffi/stories`
   - `GET /api/proffi/tasks`
   - `GET /api/proffi/tasks/{id}`
   - `POST /api/proffi/tasks`
   - `GET /api/proffi/tasks/mine`
   - `DELETE /api/proffi/tasks/{id}`
   - `GET /api/proffi/tasks/{id}/applications`
   - `POST /api/proffi/tasks/{id}/applications`
   - `GET /api/proffi/tasks/{id}/applications/preview`
   - `GET /api/proffi/tasks/{id}/specialist-info`
   - `GET /api/proffi/applications/mine`
   - `POST /api/proffi/applications/{id}/accept`
   - `GET /api/proffi/specialists`
   - `GET /api/proffi/specialists/{id}`
   - `GET /api/proffi/specialists/{id}/reviews`
   - `POST /api/proffi/uploads`
   - `GET /api/proffi/files/{path}`
   - `GET /api/proffi/chats`
   - `GET /api/proffi/chats/{id}`
   - `GET /api/proffi/chats/{id}/messages`
   - `POST /api/proffi/chats/{id}/messages`
   - Auth under `/api/proffi/auth/*`

3. Geo endpoints остаются общими:
   - `GET /api/geo/detect`
   - `GET /api/geo/reverse`
   - `GET /api/addresses/search`
   - `POST /api/address/save`
   Их не переносить в `/proffi`, если backend уже не сделал отдельные proffi-версии.

4. `TaskController@index` сейчас не обрабатывает bbox карты и, похоже, не сортирует по distance, хотя mobile отправляет `lat/lng&sort=distance`.

5. Mobile MapScreen сейчас:
   - показывает карту fullscreen с bottom sheet только для выбранной карточки;
   - не поддерживает список заданий, отфильтрованный по текущей видимой области карты;
   - не получает bounds/actionend из WebView;
   - использует balloon/обычный placemark, а web теперь показывает визуальные плашки с ценой/названием/фото.

6. В mobile есть production-опасные demo fallback:
   - `SpecialistProfileScreen` подставляет `MOCK_SPECIALIST`;
   - `TasksListScreen` подставляет `MOCK_STORIES`;
   - `TaskDetailScreen` содержит demo-ветки;
   - `AuthContext` имеет `DEV_SKIP_AUTH`, это можно оставить только как dev-флаг, по умолчанию выключенный.

7. В части mobile-файлов есть mojibake-строки. В видимых экранах, которые будут затронуты, заменить на нормальные ru-строки или вынести в `mobile/src/i18n.ts`.

## Задача 1. Централизовать API namespace mobile

Сделать в `mobile/src/api.ts` поддержку разных API-префиксов:
- по умолчанию `apiFetch()` должен ходить в `/api/proffi`;
- для общих geo endpoints добавить явную функцию или опцию, например `apiFetch(path, { namespace: "root" })`, чтобы `geo.ts` продолжал ходить в `/api`;
- `apiUploadFile()` должен отправлять в `/api/proffi/uploads`;
- `fileUrl()` должен строить `/api/proffi/files/{path}`.

Обновить все вызовы mobile:
- auth: `/auth/*` -> `/api/proffi/auth/*`;
- tasks/categories/stories/specialists/applications/chats/uploads/files -> `/api/proffi/*`;
- geo/address endpoints оставить в `/api/*`.

Проверить, что `EXPO_PUBLIC_API_URL` остаётся base URL без `/api`.

## Задача 2. Контракты данных

Привести TypeScript-типы mobile к реальным ответам Laravel:

Task:
- `id: string`
- `title`
- `description`
- `category`
- `category_id`
- `city`
- `address`
- `budget`
- `response_price_mdl`
- `deadline`
- `status`
- `customer_id`
- `customer_name`
- `accepted_specialist_id`
- `photos: string[] | Array<{url?: string; path?: string}>`
- `lat`
- `lng`
- `created_at`
- `updated_at`

Specialist:
- `id`
- `phone`
- `name`
- `role`
- `city`
- `rating`
- `reviews_count`
- `bio`
- `services`
- `avatar`
- `portfolio`
- `lat`
- `lng`
- `last_seen`
- `created_at`
- `email`
- `is_verified`

Chat:
- `id`
- `task_id`
- `task_title`
- `customer_id`
- `customer_name`
- `specialist_id`
- `specialist_name`
- `last_message`
- `last_message_at`
- `created_at`
- `updated_at`

Message:
- `id`
- `chat_id`
- `sender_id`
- `user_id`
- `text`
- `type`
- `created_at`

## Задача 3. Список заданий и фильтры

В `TasksListScreen`:
- загрузка через `GET /api/proffi/tasks`;
- поддержать query params: `category_id`, `category`, `q`, `city`, `budget_min`, `budget_max`, `lat`, `lng`, `sort`;
- category filter должен работать так же, как web: лучше передавать `category_id`, если выбран id категории;
- добавить фильтры бюджета `budget_min/budget_max`, город, поиск;
- добавить кнопку перехода на карту с сохранением текущих фильтров;
- не подставлять демо-список при ошибке API; показывать ошибку/empty state и retry;
- карточка задания должна показывать фото, цену, город/адрес, категорию, дату/статус аналогично web насколько уместно для mobile.

## Задача 4. Карта и связанный список

Эталон web:
- `shop/src/components/treabo/TreaboTasksMap.tsx`
- `shop/src/components/proffi-mock/JobsMarketplaceMapLayout.tsx`
- `shop/src/components/proffi-mock/JobsMarketplacePage.tsx`

В mobile `MapScreen.tsx` и `MapScreen.web.tsx` сделать linked layout:
- карта сверху, список снизу;
- список занимает до примерно `42vh`/нижний sheet и скроллится;
- список показывает только задания в текущей видимой области карты;
- при pan/zoom карты WebView отправляет текущие bounds в React Native;
- React Native фильтрует уже загруженные задания по bounds либо, если backend будет доработан, перезапрашивает `/tasks?sw_lat=&sw_lng=&ne_lat=&ne_lng=`;
- при клике по маркеру выделяется соответствующая карточка в списке и список прокручивается к ней;
- при клике по карточке открывается `TaskDetail`;
- геолокация центрирует карту и, если включён distance sort, обновляет список;
- при отсутствии координат у заданий показывать понятное empty state, но сами задания без координат не должны ломать список.

Маркеры/плашки:
- не использовать стандартный balloon как основной UX;
- сделать визуальную плашку на карте по аналогии с web: тёмная плашка, цена, название, опционально фото/адрес;
- активная плашка получает визуальное выделение;
- на native WebView для Yandex Maps HTML добавить события:
  - `ready`
  - `select`
  - `boundschange` или `actionend`
  - `geolocation/error` при необходимости.

Важно:
- после изменения размеров карты вызывать `container.fitToViewport()` внутри HTML/веб-реализации;
- не пересоздавать карту при каждом выделении маркера, чтобы не сбрасывать viewport.

## Задача 5. Backend/API для bounds и distance

Проверить и при необходимости доработать `pixer-api/app/Http/Controllers/Proffi/TaskController.php`:
- поддержать фильтр bbox:
  - `sw_lat`, `sw_lng`, `ne_lat`, `ne_lng`;
  - альтернативно `bounds=south,west,north,east`, если проще, но mobile и web должны использовать один формат;
- фильтр должен исключать записи без `lat/lng` только в режиме карты;
- поддержать `lat/lng&sort=distance`, если mobile продолжает это отправлять;
- добавить поле `distance_km` в ответ, когда переданы `lat/lng`;
- не ломать обычный список web: без bbox поведение прежнее.

## Задача 6. Создание задания и гео

В `CreateTaskScreen`:
- `POST /api/proffi/tasks`;
- `POST /api/proffi/uploads`;
- payload сверить с Laravel validation:
  - `title`
  - `description`
  - `category`
  - `category_id` при наличии
  - `city`
  - `address`
  - `budget`
  - `deadline`
  - `lat`
  - `lng`
  - `photos`
- адрес должен подтверждаться перед публикацией;
- если GPS недоступен, должен быть ручной ввод + suggestions;
- `saveConfirmedAddress()` оставить на root geo API;
- фото после загрузки должны потом корректно открываться через `/api/proffi/files/{path}`.

## Задача 7. Страница задания

В `TaskDetailScreen`:
- `GET /api/proffi/tasks/{id}`;
- для владельца:
  - загрузить applications;
  - показать список откликов;
  - принять отклик через `/applications/{id}/accept`;
  - после accept перейти в чат, если есть `chat_id`;
- для мастера:
  - `GET /tasks/{id}/specialist-info`;
  - перед отправкой отклика запросить `/tasks/{id}/applications/preview` и показать цену/остаток бесплатных откликов, если API возвращает paid/free info;
  - `POST /tasks/{id}/applications`;
  - после успешного отклика открыть чат, если `chat_id` вернулся;
- карта адреса должна отображаться, если есть `lat/lng`;
- фото задания должны открываться корректно;
- убрать demo branches из production-поведения.

## Задача 8. Чаты

В `src/services/chatApiService.ts`:
- использовать `/api/proffi/chats`;
- список чатов должен показывать task title и правильного собеседника;
- сообщения грузятся через `/chats/{id}/messages`;
- отправка через `POST /chats/{id}/messages` с `{ text }`;
- после отправки локальный store обновляет чат и список;
- переходы в чат проверить из:
  - списка чатов;
  - страницы задания после отклика;
  - страницы задания после принятия отклика;
  - карточки accepted application.

Не добавлять WebSocket, если он не требуется прямо сейчас. Достаточно ручного refresh/focus reload.

## Задача 9. Страницы мастера

В `SpecialistProfileScreen`:
- убрать fallback на `MOCK_SPECIALIST`;
- `GET /api/proffi/specialists/{id}`;
- показать avatar, portfolio, services, city, bio, rating/reviews_count, last_seen;
- если API вернул 404/ошибку, показать нормальный error state + retry/back;
- добавить загрузку reviews через `/specialists/{id}/reviews`, если экран уже подразумевает отзывы.

В `ProfileScreen`:
- проверить `/auth/profile`, `/auth/stats`, avatar upload, роль customer/specialist;
- для мастера проверить поля `services`, `city`, `bio`, `avatar`.

## Задача 10. i18n и тексты

- В затронутых mobile-экранах убрать mojibake (`Рќ...`, `в†’`, `Г—`, `в‚Ѕ` и т.п.).
- Видимые строки вынести в `mobile/src/i18n.ts`.
- Валюта в mobile должна соответствовать текущему API/web. Если backend отдаёт RUB, показывать `₽`/`руб.` единообразно; не смешивать `MDL`, если речь о бюджете задания. Для `response_fee_mdl` явно подписывать валюту так, как решил продукт.

## Задача 11. Проверка endpoints

Сделать и приложить короткий отчёт:

Public:
- `GET /api/proffi/categories`
- `GET /api/proffi/stories`
- `GET /api/proffi/tasks`
- `GET /api/proffi/tasks?category_id=...`
- `GET /api/proffi/tasks?q=...`
- `GET /api/proffi/tasks?city=...`
- `GET /api/proffi/tasks?sw_lat=...&sw_lng=...&ne_lat=...&ne_lng=...`
- `GET /api/proffi/tasks/{id}`
- `GET /api/proffi/specialists`
- `GET /api/proffi/specialists/{id}`
- `GET /api/proffi/specialists/{id}/reviews`

Auth:
- `GET /api/proffi/auth/me`
- `PATCH/POST /api/proffi/auth/profile`
- `GET /api/proffi/auth/stats`

Customer:
- `POST /api/proffi/tasks`
- `GET /api/proffi/tasks/mine`
- `GET /api/proffi/tasks/{id}/applications`
- `POST /api/proffi/applications/{id}/accept`
- `DELETE /api/proffi/tasks/{id}`

Specialist:
- `GET /api/proffi/applications/mine`
- `GET /api/proffi/tasks/{id}/specialist-info`
- `GET /api/proffi/tasks/{id}/applications/preview`
- `POST /api/proffi/tasks/{id}/applications`

Chats:
- `GET /api/proffi/chats`
- `GET /api/proffi/chats/{id}`
- `GET /api/proffi/chats/{id}/messages`
- `POST /api/proffi/chats/{id}/messages`

Geo:
- `GET /api/geo/detect`
- `GET /api/geo/reverse?lat=&lng=`
- `GET /api/addresses/search?query=`
- `POST /api/address/save`

## Acceptance criteria

- Mobile запускается без runtime errors на `expo start --web` и native Expo.
- Все mobile-запросы к Treabo/Proffi идут в `/api/proffi`, кроме geo root endpoints.
- Список заданий показывает реальные задания из Laravel.
- Фильтры поиска/категории/города/бюджета реально меняют выдачу.
- Кнопка карты сохраняет фильтры.
- Карта показывает задания с координатами.
- На карте есть плашки заданий, не только стандартные pins.
- Pan/zoom карты обновляет список в зоне видимости.
- Клик по плашке выделяет и прокручивает карточку.
- Клик по карточке открывает страницу задания.
- Геолокация центрирует карту и не ломает список.
- Создание задания сохраняет `lat/lng`, адрес и фото.
- Страница задания работает для заказчика и мастера.
- Отклик мастера создаёт application и chat.
- Принятие отклика заказчиком открывает/создаёт chat.
- Чаты реально грузят сообщения и отправляют новое сообщение.
- Страница мастера показывает реальные данные, без mock fallback.
- В затронутых экранах нет mojibake-строк.
- Нет production demo fallback, кроме явно выключенного dev-флага.
- Деплой не выполнен.

## Что приложить после выполнения

1. Список изменённых файлов.
2. Какие endpoints проверены и каким результатом.
3. Скриншоты/видео:
   - список заданий;
   - карта + список после pan/zoom;
   - страница задания;
   - создание задания с адресом/фото;
   - чат после отклика;
   - профиль мастера.
4. Известные ограничения, если что-то зависит от backend/env/token/API key.
