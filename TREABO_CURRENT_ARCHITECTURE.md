# TREABO: технический слепок текущей архитектуры

Аудит кода на 15.09.2026. Основной контур ниже — мобильные приложения и Laravel API `/api/proffi`; наличие классов и миграций не доказывает, что все функции включены на конкретном сервере. `backend/` (FastAPI), `frontend/` и Marvel/`shop/` указаны отдельно, чтобы не смешивать разные модели данных. Источники истины: `mobile*/src/navigation/RootNavigator.tsx`, `mobile*/src/api.ts`, `pixer-api/routes/proffi.php`, контроллеры/модели `pixer-api/app/{Http/Controllers/Proffi,Models}` и миграции `pixer-api/database/migrations/`.

## 1. Общая архитектура

- **CLIENT / MASTER:** два самостоятельных Expo 54 + React Native приложения (`mobile/`, `mobile-specialist/`), со своими package ID, EAS project ID, APK, навигацией и сценариями. Оба обращаются к одному Laravel API. Expo SecureStore хранит Sanctum bearer token; web-режим использует localStorage.
- **API:** Laravel в `pixer-api/`, маршруты TREABO сосредоточены в `routes/proffi.php` под `/api/proffi`, параллельно существует исходный Marvel API для магазина/Places. Auth — Laravel Sanctum, роли/permissions — Spatie/Marvel; админ-маршруты защищены `ProffiAdminToken` (заголовок `X-Admin-Token` или bearer супер-админа).
- **БД:** Laravel Eloquent + MySQL в Docker/VPS-конфигурации, общий `users`/`user_profiles` Marvel и отдельные `proffi_*`, `request_drafts`, AI-таблицы. `backend/` содержит **другую** FastAPI + SQLAlchemy/SQLite реализацию MVP (`server.py`, `models.py`, `db.py`); мобильные `api.ts` по умолчанию нацелены на Laravel `:8001`, а не эту БД.
- **Медиа:** Laravel `UploadController` сохраняет файлы на настраиваемый Storage disk (по умолчанию `public`, префикс `proffi/`); в заявках/отзывах/профилях/чате хранятся URL или пути, а не универсальная связь с media-entity. У Marvel есть отдельные `media`, `places`, `place_images` и классы для видео.
- **Гео/карта:** Yandex Maps JS 2.1 внутри React Native WebView; `expo-location`; российский/молдавский справочники локаций. Для web-клиента `frontend/` есть Leaflet/React Leaflet.
- **Realtime/уведомления:** Laravel broadcasting (`proffi.chat.{chatId}`) + Echo/Pusher-клиенты, REST polling чата; Expo Push для сообщений и подтверждения входа мастера, email для сообщений/OTP. Отдельного общего центра внутренних уведомлений TREABO не обнаружено.
- **Сторонние сервисы:** OpenAI Responses API для AI-заявок, Yandex Maps, Expo Push, YooKassa и настраиваемая ссылка ручного пополнения, OAuth-провайдеры в AuthController; Marvel/Shop также использует собственные commerce-интеграции.

```text
CLIENT (mobile) ─┐
MASTER (mobile-specialist) ─┼─> Laravel /api/proffi ─> MySQL: users + user_profiles + proffi_* + AI_*
WEB (frontend) ─┘             │        │
ADMIN (admin/ Next.js) ────────┘        ├─> Storage disk /api/proffi/files
                                     ├─> Yandex / OpenAI / Expo Push / YooKassa
                                     └─> Broadcasting (Echo/Pusher) + email
shop/ Next.js ─────────────────> Marvel API ─> та же база: products, places, media, commerce
backend/ FastAPI ──────────────> отдельный SQLite MVP (не основное mobile API)
```

## 2. Приложения и клиенты

| Путь | Технология, пользователь | Назначение и основные экраны |
|---|---|---|
| `mobile/` | Expo/React Native; заказчик | Вход по телефону, главная, AI-создание заявки, детали/отклики, карта, чаты, профиль/отзывы мастера. Android `ru.treabo.client`, схема `treabo-client`. |
| `mobile-specialist/` | отдельный Expo/React Native; мастер | Заявки/поиск/карта, отклик и подробности, чаты, баланс, профиль/портфолио, верификация. Android `ru.treabo.specialist`, схема `treabo-specialist`. |
| `frontend/` | React SPA/React Router; обе роли в одном web-клиенте | Onboarding/login/register, home, tasks/map/detail/create-task, orders, chats, profile, specialist profile; роль меняет стартовый маршрут. Это соседний web-клиент с более ранним flow, не тождественный двум mobile APK. |
| `admin/` | Next.js; администратор | `/proffi/*` для заказчиков/мастеров, заявок, откликов, чатов, справочников, отзывов, проверок, настроек и AI. В том же проекте есть исходная Marvel-админка магазина. |
| `shop/` | Next.js; покупатель/продавец marketplace | Marvel-магазин/Places/commerce, отдельный продуктовый контур общей Laravel базы, не клиент заявок mobile. |

`backend/` — серверный MVP, а не ещё один клиент. **CLIENT и MASTER реально разделены на уровне приложений и бинарников**; в Laravel они используют общие `users`/`user_profiles` и API с ролью в permissions.

## 3. Навигация мобильных приложений

| Приложение | Текущие tabs / вложенные screens |
|---|---|
| CLIENT | `Home` (главная, заявки/специалисты), центральный `Create` (ведёт в `AiCreateRequest`), `Chats`, `Profile`. Stack: `TaskDetail` (заявка/отклики), `ChatDetail`, `SpecialistProfile`, `PhoneChange`, `MyReviews`; auth: `Welcome`, `PhoneEntry`, `Login`. `Map`/`TasksList`/поиск/фильтр есть как компоненты и типы маршрутов, но в текущем CLIENT `RootNavigator` не зарегистрированы как отдельные tab/stack screens; доступ к карте надо оценивать по вызовам из главной. |
| MASTER | `Home` (вложенный `TasksHome`, `Map`, `TasksList`, `TaskSearch`, `TaskFilter`), `Wallet`, `Chats`, `Profile`. Stack: `TaskDetail`, `TaskApply`, `CreateTask`, `ChatDetail`, профили заказчика/мастера, `PhoneChange`, `IdentityVerification`, `MyReviews`, `PaymentReturn`; auth: `Welcome`, `PhoneEntry`, `Login`. `CreateTask` зарегистрирован, хотя API запрещает мастеру создавать заявку. |

## 4. Роли пользователей

Эффективное поле `role` **не отдельная колонка TREABO**: `MapsProffiUsers::proffiRole()` возвращает `admin` при `super_admin`, иначе `specialist` при Marvel `store_owner`, иначе `customer`. Регистрация мастера выдаёт `store_owner` **и** `customer` permission; значит технически у аккаунта могут быть несколько permissions, но в TREABO UI/API показывается одна эффективная роль. `AuthController::canAddRoleForPhone()` запрещает перевести уже связанный с одной ролью номер в другую; экраны входа раздельны, логин проверяет ожидаемую роль. Клиент создаёт заявку и принимает отклик; мастер ищет/откликается/платит за отклик; админ управляет данными через отдельные маршруты. В `backend/models.py` альтернативного MVP есть самостоятельное строковое `role`, не связанное с Laravel.

## 5. User / Profile / Master Profile

В основном Laravel контуре **нет отдельной таблицы `MasterProfile` или `ClientProfile`**. `Marvel\Database\Models\User` (`users`: id, name, email, password, avatar/дополнительные поля из Marvel) имеет `Profile` (`user_profiles`, `customer_id`, телефон `contact`, `bio`, `avatar` JSON, `socials` JSON, `notifications`, `proffi_city`, `proffi_services` JSON, `proffi_lat`, `proffi_lng`, phone/identity flags). `services` и портфолио (`socials.treabo_portfolio`, до 10 URL) — поля профиля мастера, не связь many-to-many с услугами. `AuthController::updateProfile()` сверяет значения services с названиями `ProffiCategory` и `ProffiWork`.

```text
users (permissions: customer / store_owner / super_admin)
 └─ user_profiles (customer_id; proffi_city/services/lat/lng; avatar/portfolio/bio)
proffi_categories ─< proffi_works ─< proffi_work_questions
                       └─ proffi_tasks.work_id
proffi_tasks.category_id ─> proffi_categories.id
proffi_tasks.location_id ─> russia_locations.id
```

`ProffiCategory` (`proffi_categories`: id, slug/имена/иконка/изображение по поздним миграциям), `ProffiWork` (`proffi_works`: category_id, title, aliases, active), `RussiaLocation`/`MoldovaLocation` — реальные справочники. Самостоятельной модели `Service` TREABO нет: ближайшая сущность — `ProffiWork`.

## 6. Заявки (`ProffiTask`) — основной сценарий

Главная таблица **`proffi_tasks`**, а не Marvel `orders` и не FastAPI `tasks`. Поля: `customer_id`, `accepted_specialist_id`, `title`, `description`, строковый `category` + `category_id`, `work_id`, `city`, `location_id`, `address`, `lat/lng`, `photos` JSON, `budget`/`budget_type`/`budget_min`/`budget_max`, `deadline`, `response_price_mdl`, `ai_details` JSON, `status`, timestamps. Дополнительные структурированные ответы связаны через `job_attribute_values` (`job_id`) и AI-draft ответы.

```text
users(customer) ─creates─> proffi_tasks (category/work, текст, фото, точка, бюджет, срок, status)
                            ├─< proffi_applications ─> users(store_owner)
                            ├─< proffi_task_recommended_specialists ─> users(store_owner)
                            ├─< proffi_chats ─< proffi_messages
                            ├─< proffi_reviews
                            └─ request_drafts.task_id (если создано через AI)
```

**Создание:** CLIENT использует `AiCreateRequestScreen` → `request_drafts` → `/confirm`; Laravel `RequestDraftPublisher` проверяет выбранную категорию/работу, подтверждённую точку и обязательные ответы, создаёт `ProffiTask` со статусом `open`, сохраняет `ai_details` и назначает рекомендованных мастеров. Есть также прямой `POST /tasks` (`TaskController::store`) для заказчика/админки: валидирует поля, нормализует город через `TaskLocationService`, требует координаты для введённого адреса, создаёт `open` и запускает matching. FastAPI `server.py`/`models.py` содержит отдельный MVP аналог заявки.

**Просмотр:** публичный `GET /tasks` отдаёт только `open`, с фильтрами категории/текста/города/бюджета/favorites/viewport и лимитом 100 или 200; `GET /tasks/{id}` публичен, `GET /tasks/mine` возвращает все заявки владельца. MASTER видит открытый список/карту, клиент — свои заявки и отклики. Matching (`MasterMatchingService`) на создании пишет до 5 ранжированных `proffi_task_recommended_specialists`: город, услуги, рейтинг/число отзывов, онлайн и текст профиля, веса из `treabo_matching_settings`; это рекомендации, а не автоматическое назначение.

**Статусы:** в рабочих переходах `open` → `in_progress` при принятии отклика; `POST /tasks/{id}/close` переводит в `cancelled`, удаление доступно владельцу. Админка может установить `open`, `in_progress`, `done`, `cancelled`; `TaskController::mapTask` также трактует `closed`/`completed` как закрытые, а CLIENT UI ожидает `completed`. Единого согласованного финального перехода `in_progress` → `completed` в публичном TREABO API не найдено. При принятии сохраняется `accepted_specialist_id`, остальные отклики становятся `rejected`; закрытие не привязано к обязательному отзыву или платежу.

## 7. AI-создание заявки

Текущий основной frontend — `mobile/screens/AiCreateRequestScreen.tsx` + `mobile/src/services/requestAssistant.ts`. Клиент начинает текстом проблемы, получает действия `clarify_intent`/`choose_category`/`choose_service`/`split_intents`/`ask_question`/`review`, отвечает на вопросы `ProffiWorkQuestion` (включая фото), подтверждает категорию/работу, адрес/координаты и бюджет, затем публикует после review. `client_draft_id` хранится в AsyncStorage; flow может восстановить последний draft. Вопросы и conditional rules управляются админкой.

Backend: `RequestDraftController` (`POST /request-drafts`, `GET /latest`, `GET /{draft}`, `POST /{draft}/turns`, `PATCH /{draft}`, `POST /{draft}/confirm`), `RequestDraftOrchestrator`, `DialogueInferenceService`, `ConditionalQuestionEngine`, `RequestDraftPublisher`. Draft хранится в `request_drafts` (`snapshot` JSON, выбранные category/service, version/status, user/guest token, task_id, usage), реплики — `request_draft_messages`, ответы и источник/уверенность — `request_draft_answers`, аудит переходов — `request_draft_events`, вызовы AI — `ai_invocations`; конфигурации в `ai_prompt_versions` и AI knowledge tables. AI классифицирует запрос, распознаёт намерения/категорию/работу, извлекает факты и предлагает уточнение; после подтверждения в `proffi_tasks` попадают нормализованные title/description, category/work, location, budget, photos и `ai_details` (включая summary/constraints/preferences), а не весь диалог как текст заявки.

`DialogueInferenceService` вызывает **OpenAI Responses API** с `text.format.type=json_schema`, `strict=true`; модель берётся из опубликованной версии prompt, fallback из `config/ai_assistant.php` — `gpt-4.1-mini` (может быть переопределён env). Параллельно существует более старый `POST /ai/job-draft`/`JobDraftAiService` с собственным строгим JSON schema и моделью из `services.openai.model` (fallback `gpt-5.6-luna`); это отдельный путь, не основной mobile interview.

## 8. Map / geo

`MapScreen` обоих mobile и `src/maps/yandexMapHtml.ts` конвертируют **заявки** с `lat/lng` в Yandex placemarks; мастера там не являются маркерами. Yandex `ymaps.Clusterer` группирует маркеры, WebView сообщает viewport; приложение передаёт `sw_lat/sw_lng/ne_lat/ne_lng` в `GET /tasks`, локально оставляет точки внутри bounds. `TaskController::index` фильтрует координаты по bounding box и вычисляет Haversine `distance_km`/сортировку после выборки; явного SQL radius-фильтра/геоиндекса для списка заявок нет. `MasterMatchingService` использует город/услуги, не расстояние. Профиль мастера хранит `proffi_lat/lng`, но отдельного поля `radius` TREABO нет.

`proffi_tasks`: `city`, `location_id`, `address`, `lat`, `lng`; `user_profiles`: `proffi_city`, `proffi_lat`, `proffi_lng`; `russia_locations`/`moldova_locations`: справочные координаты. Адрес в AI flow выбирается и подтверждается, `TaskLocationService` может подставить координаты населённого пункта. `expo-location` запрашивает foreground permission в `MapScreen`; Android manifest/app config включает coarse/fine location. Для web `frontend/pages/MapView` есть Leaflet. Отдельные Marvel гео-модели магазина (`regions`, `geo_points`, `user_locations`) не относятся к карте заявок.

## 9. Отклики

`ProffiApplication`/`proffi_applications`: `task_id`, `specialist_id`, обязательное `message`, опциональная `price`, `response_fee_mdl`, `status`, timestamps; уникальность `(task_id,specialist_id)`. Срок исполнения в самом отклике не хранится (срок есть у заявки). MASTER UI — `TaskApplyScreen`, CLIENT — детали заявки/список applications; API: `GET /tasks/{id}/applications/preview`, `POST /tasks/{id}/applications`, `GET /applications/mine`, `GET /tasks/{id}/applications`, `POST /applications/{id}/accept`. Отклик на собственную/не открытую заявку запрещён; существующий отклик обновляет цену/сообщение и возвращается в `pending`. Новый отклик создаёт чат и первое сообщение. `accept` доступен владельцу заявки: выбранный `accepted`, все другие `rejected`, задача `in_progress`; отдельного публичного reject endpoint нет. Приём не проверяет, что задача ещё `open`, в этом месте важен риск конкурентных выборов.

## 10. Чат

`ProffiChat`/`proffi_chats`: `task_id`, опциональный `application_id`, `customer_id`, `specialist_id`, последний текст/время, отметки чтения и typing; уникальность `(task_id,specialist_id)`. `ProffiMessage`/`proffi_messages`: `chat_id`, `sender_id`, `text`, `type=text|image|file`, `metadata` JSON, `delivered_at`, `read_at`, timestamps. Чат создаётся при отклике, принятии или явном `contact-specialist`; доступ к REST и приватному broadcast-каналу разрешён только двум участникам. API `/chats`, `/chats/{id}`, `/messages` GET/POST, `/read`, `/typing`, `/presence/heartbeat` и выдача маскированного/контактного телефона.

`ChatController` отправляет события `MessageSent`, `MessagesRead`, `UserTyping` в `proffi.chat.{id}`, Echo/Pusher есть в `mobile*/src/services/realtime.ts`; `mobile/src/screens/ChatScreen.tsx` также опрашивает сообщения каждые 8 секунд. Фото/файл передаются URL/metadata после `/uploads`, собственной таблицы вложений чата TREABO нет. Новое сообщение вызывает Expo push `chat_message` с deeplink и email; присутствие хранится в `proffi_user_presence`.

## 11. Отзывы / рейтинг

`ProffiReview`/`proffi_reviews` связана с `task_id`, `specialist_id`, `customer_id`; поля `rating` 1–5, `comment`, `photos` JSON (до 10 URL), timestamps, уникальность задачи/клиента/мастера. `GET /specialists/{id}/reviews` публичный; `POST` разрешён заказчику после выбора данного мастера (`accepted_specialist_id` или accepted application), без требования финального `completed`. Рейтинг и число отзывов вычисляются из `proffi_reviews` при выдаче профиля и участвуют в matching. Marvel `reviews` магазина — другая сущность.

## 12. Платежи / баланс / платный отклик

Платный отклик **реализован**: `TreaboResponseSetting` (`treabo_response_settings`) задаёт цену, ежедневный и лимит бесплатных откликов на заявку, ручное пополнение; у задачи есть `response_price_mdl`, у отклика — фактически списанный `response_fee_mdl`. `ApplicationController::preview` возвращает бесплатные остатки, признак первого платного часа, цену; при новом платном отклике в DB-транзакции проверяет и списывает `SellerBalance` (`seller_balances`) либо возвращает HTTP 402. Повторное редактирование отклика не списывает заново.

`GET /balance`, `/balance/transactions`, `POST /balance/deposit`, `/balance/deposit/report`, `GET /balance/check-pending`; `BalanceDeposit` (`balance_deposits`) хранит пополнения. `SellerBalanceController` поддерживает YooKassa (создание/проверка платежа), ручную оплату по настроенной ссылке с сообщением об оплате, виртуальное админ-пополнение; MASTER `WalletScreen` показывает баланс/историю. Это оплата **доступа к отклику**, не расчёт клиента с мастером за выполненную работу. В именах DB/API сохранён суффикс `mdl`, при этом ответ API указывает `currency=RUB` — реальное несоответствие соглашений.

## 13. Фото / video / media

`POST /uploads` (authenticated, плюс admin upload) принимает jpg/jpeg/png/webp/heic/heif/pdf, максимум **20 MiB**, опциональный `folder`, генерирует UUID и путь `proffi/{folder}/YYYY/MM/`; `GET /files/{path}` отдаёт public disk или URL другого disk. `photos` заявки и отзыва — JSON-массив строк URL/путей; `avatar` — JSON в `user_profiles`; портфолио — `socials.treabo_portfolio`; чат — `metadata` для `image/file`. В TREABO uploader нет обязательной обработки/ресайза/thumbnail и нет привязки файла к владельцу/сущности в отдельной таблице. В `backend/main.py` MVP есть локальный Pillow upload, но это другая инфраструктура.

Для будущей PLACE технически **можно использовать сам Laravel Storage upload/выдачу URL**, с адаптацией owner/entity и возможных ограничений. В **соседнем Marvel контуре уже существуют** `Place`, `places`, `PlaceImage`/`place_images`, `PlaceVideo`-класс и общая Spatie media-инфраструктура; они не связаны с `proffi_tasks` и не являются текущим mobile media flow. Это факт текущего репозитория, не проектирование новой PLACE.

## 14. Уведомления

`ProffiPushToken`/`proffi_push_tokens` хранит Expo token, platform/device; оба mobile регистрируют token после permission и раскрывают deeplink. `ExpoPushService` шлёт Expo Push. Подтверждённые вызовы: `chat_message` при новом сообщении и `login_confirmation` для push-входа мастера (`proffi_push_login_requests`). Для чата также email `ProffiNewMessageMail`; телефонные OTP/reset — email/телефонный канал из AuthController. REST-unread/typing/presence — внутреннее состояние чата, не общая notification feed. В контроллерах создания заявки/отклика/принятия не найдено отправки push `new_request`/`new_response`/`response_accepted` — модели/маршруты есть, эти уведомления как события текущего TREABO не подтверждены.

## 15. Admin

Next.js `admin/src/pages/proffi/` использует Laravel admin API для статистики, users/customers/specialists, создания/изменения/удаления пользователей и заявок, откликов и просмотра чатов, CRUD категорий/видов работ/вопросов/условных правил, отзывов, верификаций мастеров, branding/response/matching/mobile-update settings, пополнений и AI knowledge lab/операций. Чат в админке просматривается, отправка сообщения админом не видна в `routes/proffi.php`. Параллельные страницы Marvel admin управляют магазином и не являются TREABO request admin. Доступ `/api/admin/*` и `/api/proffi/admin/*` проходит через `ProffiAdminToken`.

## 16. Основные группы API

Все пути ниже относительно **`/api/proffi`**; root aliases `/api/admin/*` существуют для админки.

| Группа | Основные маршруты |
|---|---|
| Auth/Profile | `POST /auth/customer|specialist/check-phone`, `/register-phone`, `/login`, OTP/verify, OAuth redirect/callback; `GET /auth/me`, `/stats`; `PATCH /auth/profile`, смена телефона, push-token/push-login. |
| Requests/AI | `GET/POST /tasks`, `GET /tasks/mine`, `GET /tasks/{id}`, `PATCH /tasks/{id}/budget`, `POST /tasks/{id}/close`; `POST /request-drafts`, `POST /request-drafts/{id}/turns`, `PATCH /request-drafts/{id}`, `POST /request-drafts/{id}/confirm`; старый `POST /ai/job-draft`. |
| Responses | `GET/POST /tasks/{id}/applications`, `GET /tasks/{id}/applications/preview`, `GET /applications/mine`, `POST /applications/{id}/accept`, `GET /tasks/{id}/recommended-specialists`. |
| Chat | `GET /chats`, `GET /chats/{id}/messages`, `POST /chats/{id}/messages|read|typing`, `POST /presence/heartbeat`; контакт мастера через `/tasks/{id}/contact-specialist/{user}`. |
| Map/Geo | `GET /tasks?sw_lat&sw_lng&ne_lat&ne_lng&lat&lng&sort=distance`; `GET /locations/russia/search`, `/locations/moldova/search`, `/locations/search`; `GET /specialists`. |
| Media/Reviews | `POST /uploads`, `GET /files/{path}`; `GET/POST /specialists/{id}/reviews`. |
| Payments/Notifications | `GET /balance`, `/balance/transactions`, `/balance/check-pending`; `POST /balance/deposit`, `/balance/deposit/report`; `POST/DELETE /auth/push-tokens`, push-login request/approve/reject. |
| Admin | `GET /admin/stats|users|customers|specialists|tasks|applications|chats|reviews`, CRUD категорий/заявок/отзывов/работ/вопросов, settings, AI lab. |

## 17. Database — компактная ER-схема

```text
users ─1:1─ user_profiles (customer_id; role via permissions)
  ├─< proffi_tasks.customer_id ──> proffi_categories.id / proffi_works.id / russia_locations.id
  │      ├─ accepted_specialist_id ──────────────> users
  │      ├─< proffi_applications ─ specialist_id > users
  │      ├─< proffi_task_recommended_specialists ─> users
  │      ├─< proffi_chats ─< proffi_messages ─ sender_id > users
  │      ├─< proffi_reviews ─ customer/specialist_id > users
  │      ├─< proffi_favorites ─ user_id > users
  │      └─< job_attribute_values (job_id)
  ├─< proffi_push_tokens; proffi_user_presence; proffi_identity_verifications
  └─1:1 seller_balances ─< balance_deposits
proffi_categories ─< proffi_works ─< proffi_work_questions
request_drafts ─ user_id > users; task_id > proffi_tasks
  ├─< request_draft_messages / request_draft_answers / request_draft_events
  └─< ai_invocations ─> ai_prompt_versions / ai_knowledge_versions
```

Имена и внешние ключи — из Laravel моделей/миграций; `photos`, `services`, `ai_details`, portfolio и message metadata являются JSON/URL-полями, а не отдельными ER-связями. `backend/models.py` содержит другой набор `users/tasks/applications/chats/messages/categories/filters/files` в SQLite, его нельзя считать зеркалом таблиц Laravel.

## 18. Что технически уже существует для TREABO Places

Оценка касается **переиспользования текущего кода**, а не предложения новой архитектуры. `READY` — почти самостоятельный компонент, `ADAPT` — нужна привязка к новой сущности/flow, `COUPLED` — жёстко привязан к заявкам/мастерам, `MISSING` — нет в TREABO request контуре.

| Компонент | Оценка | Основание |
|---|---|---|
| Auth | ADAPT | Sanctum/OTP/OAuth работают, но вход и effective role жёстко разделяют клиента/мастера по номеру. |
| Profile | ADAPT | Общий `User`/`Profile` готов, services/portfolio/geo находятся в `user_profiles`, но мастерские поля/роль специфичны. |
| Media uploader | ADAPT | Storage upload/URL работает, но файловая связь с сущностью и processing отсутствуют в Proffi; Marvel Place media — отдельный flow. |
| Categories / works | COUPLED | `proffi_categories`/`proffi_works` описывают услуги и вопросы к заявке. |
| Geo | ADAPT | Координаты, поиск города и bounds есть; нет единой place-геомодели или radius-фильтра заявок. |
| Map | ADAPT | Yandex WebView/clusterer/viewport готов, маркеры и карточки построены из `ProffiTask`. |
| Requests | COUPLED | `ProffiTask` и статусы/owner/accepted specialist отражают заказ услуги. |
| Responses | COUPLED | `ProffiApplication` + fee/кошелёк привязаны к `ProffiTask` и мастеру. |
| Chat | COUPLED | `ProffiChat` уникален по task+specialist, access/broadcast/push опираются на пару заказчик–мастер. |
| Reviews | COUPLED | `ProffiReview` требует выбранного мастера в заявке. Marvel Place comments — другой контур. |
| Notifications | ADAPT | Expo token/send/deeplink повторно применимы; подтверждены лишь чат и push-login. |
| Admin | ADAPT | Next.js страницы и admin API есть, CRUD ориентирован на Proffi сущности. |
| AI request creation | COUPLED | Интервью/knowledge/questions и publisher создают именно `ProffiTask`. |
| Отдельная TREABO PLACE сущность | MISSING | В `proffi_*` её нет; Marvel `places/place_images` существуют вне mobile request flow. |

## 19. Технический долг и риски связности

- **Роли/auth:** `store_owner` одновременно имеет `customer` permission, но `proffiRole()` сворачивает его в `specialist`; телефон нельзя привязать к другой роли. Изменения permission, login и UI разом затронут сценарии создания/отклика. В `ProffiAdminToken` есть fallback строкового admin token; его корректность зависит от серверной конфигурации.
- **Статусы заявок:** API переходы `open/in_progress/cancelled`, админ `done`, UI/статистика `completed`, mapper понимает `closed`; финальный сценарий не унифицирован. Принятие отклика изменяет сразу application, другие applications, task и chat без общей transaction/проверки `open` в `accept`.
- **Две серверные схемы:** `backend/` SQLite и Laravel MySQL имеют однотипные названия, но разные ключи/поля и хранилище файлов; одинаковое название endpoint не означает общую БД. `shop/` Marvel Place/commerce пользуется той же Laravel базой, но другими моделями media/reviews/chat.
- **Навигация:** два Expo проекта имеют похожие компоненты, но разные зарегистрированные маршруты. CLIENT `Map` присутствует в коде/типах, не в зарегистрированном Root stack; MASTER `CreateTask` есть в Root stack при запрете создания через API. CLIENT app scheme `treabo-client`, навигатор также содержит другой deep-link prefix — нужно проверять фактический переход из push.
- **Медиа и гео:** JSON-массивы URL в tasks/reviews/profile/chat не обеспечивают referential integrity/удаление файла с записью; карта сортирует ограниченную выборку, bounds отсекает заявки без координат; matching по городу/услуге не использует расстояние.
- **Уведомления/оплата:** push для событий заявки/отклика/принятия не подтверждён, зато сообщение вызывает broadcast/email/push и mobile polling. `mdl` в названиях денежных полей при `RUB` в API/кошельке осложняет изменение ценовой логики.

## 20. Итоговая схема TREABO сейчас

```text
                         users + user_profiles + permissions
                         /                                \
            CUSTOMER (mobile CLIENT)              STORE_OWNER (mobile MASTER)
                    |                                      |
             phone/OTP/Sanctum                       phone/OTP/Sanctum
                    |                                      |
      AI interview: request_drafts                     Tasks Home / Search / Map
      (OpenAI + work questions)                         (Yandex: open proffi_tasks)
                    |                                      |
      confirm OR direct POST /tasks                     POST application
                    |                                 (free limit OR seller_balance fee)
                    v                                      |
             proffi_tasks [open] <─────────────────────────┘
               | category/work/location/photos/budget/ai_details
               ├─ Yandex Map marker (when lat/lng)
               ├─ recommended specialists (matching score)
               ├─ proffi_applications [pending → accepted / rejected]
               |                  └─ accepted → task [in_progress], accepted_specialist_id
               ├─ proffi_chats ─ proffi_messages (REST + broadcast + polling)
               |                  └─ message → Expo Push + email
               ├─ proffi_reviews (customer rates chosen specialist)
               └─ customer close → [cancelled] / admin status [done]

     ADMIN (Next.js /proffi) → CRUD/users/tasks/categories/works/questions/reviews,
                               verifications/settings/balance/AI knowledge lab
     MARVEL SHOP/PLACES → соседние products/places/media/commerce той же Laravel БД
     FASTAPI MVP → отдельные SQLite tables, не основной API этих mobile приложений
```
