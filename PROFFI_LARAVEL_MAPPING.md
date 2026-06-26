# Proffi -> Laravel Pixer API Mapping

Этот документ - рабочая карта подключения Proffi mobile/web/admin к Laravel проекту `pixer-api` на базе `packages/marvel`.

Связанный документ по клиенту: `PROFFI_APP_MAP.md`.

## Состояние Сканирования

Laravel проект найден:

- `pixer-api/artisan`
- `pixer-api/composer.json`
- `pixer-api/.env`
- `pixer-api/packages/marvel`
- `pixer-api/routes/api.php`

Marvel package:

- namespace: `Marvel\`
- path: `pixer-api/packages/marvel/src`
- registered providers: `Marvel\ShopServiceProvider`, `Marvel\Providers\RestApiServiceProvider`
- routes source: `packages/marvel/src/Rest/Routes.php`

Локальный запуск пока заблокирован окружением:

- `php` не найден в PATH
- `composer` не найден в PATH
- `vendor/` отсутствует
- `storage/` отсутствует
- `.env` сейчас production-oriented: `APP_ENV=production`, `APP_URL=https://sancan.ru`, `DB_CONNECTION=mysql`, `CACHE_DRIVER=redis`, `QUEUE_CONNECTION=redis`

Для запуска Laravel локально нужно отдельно подготовить PHP/Composer, `vendor`, `storage`, локальный `.env`, базу и, вероятно, отключить Redis на `file/database/sync` для dev.

## Главный Вывод

В `packages/marvel` уже есть большая часть базовой инфраструктуры marketplace:

- users/profiles/permissions/Sanctum auth
- categories
- orders
- shops/sellers
- products
- attachments/uploads
- conversations/messages/chat attachments
- OTP hooks
- admin/super-admin routes

Но текущий Proffi client ожидает другой контракт:

- Proffi task/order - это заявка на услугу, а не ecommerce order/product cart.
- Proffi specialist - это исполнитель, не обязательно shop.
- Proffi application/offer - отклик специалиста на задачу; в Marvel прямого аналога не найдено.
- Proffi chat создается после принятия отклика и связан с task/customer/specialist; Marvel conversation сейчас связан с `user_id + shop_id`.

Поэтому безопасная стратегия: сделать Laravel adapter layer под текущий Proffi JSON contract, используя Marvel модели там, где они подходят, и добавляя новые таблицы/модели там, где Marvel не покрывает сценарий.

## Существующие Marvel Возможности

### Auth / Users

Файлы:

- `packages/marvel/src/Http/Controllers/UserController.php`
- `packages/marvel/src/Database/Models/User.php`
- `packages/marvel/src/Database/Models/Profile.php`
- `packages/marvel/src/Http/Controllers/AuthPhoneController.php`

Существующие routes:

- `POST /register` -> `UserController@register`
- `POST /token` -> `UserController@token`
- `POST /logout` -> `UserController@logout`
- `GET /me` inside auth group -> `UserController@me`
- `POST /send-otp-code`
- `POST /verify-otp-code`
- `POST /otp-login`
- `POST /set-pin-code`
- `POST /verify-pin-code`

Notes:

- Auth uses Sanctum tokens.
- `UserController@token` expects `email + password`, not `phone + password`.
- `UserController@register` expects Marvel style `email/password/permission`, not Proffi phone registration.
- `Profile` table is `user_profiles`, stores `contact`, avatar JSON, phone verification flags, seller fields.
- Permissions include `customer`, `store_owner`, `staff`, `super_admin` style values.

Proffi adapter required:

- `POST /api/auth/check-phone`
- `POST /api/auth/register-phone`
- `POST /api/auth/login`
- `POST /api/auth/register` email OTP
- `POST /api/auth/verify`
- `GET /api/auth/me`
- `GET /api/auth/stats`
- `PATCH /api/auth/profile`

Recommended mapping:

- Proffi `customer` -> Marvel permission `customer`
- Proffi `specialist` -> Marvel permission `store_owner` or a new permission `specialist`
- Proffi `phone` -> `user_profiles.contact`
- Proffi `avatar` -> `user_profiles.avatar` JSON or Proffi adapter string path
- Proffi `bio/services/city/lat/lng` -> either existing `user_profiles` fields if available, or add columns.

### Categories

Files:

- `packages/marvel/src/Http/Controllers/CategoryController.php`
- `packages/marvel/src/Database/Models/Category.php`
- migrations in `packages/marvel/database/migrations/*create_marvel_tables*`, plus category updates

Routes:

- `GET /categories`
- `GET /categories/menu`
- `GET /categories/debug`
- `GET /categories/{categoryId}/attributes`
- super-admin/staff CRUD routes for categories

Proffi expected:

- `GET /api/categories` returns flat array:
  - `id`
  - `icon`
  - `name_ru`
  - `name_ro`

Adapter needed:

- Convert Marvel category `id/name/icon` into Proffi shape.
- For `name_ro`, either use translation/language records or mirror `name_ru` until RO content exists.

### Orders / Tasks

Files:

- `packages/marvel/src/Http/Controllers/OrderController.php`
- `packages/marvel/src/Database/Models/Order.php`
- `packages/marvel/src/Database/Repositories/OrderRepository.php`

Routes:

- `GET /orders`
- `POST /orders`
- `GET /orders/{id}`
- `PUT /orders/{id}`
- `DELETE /orders/{id}`
- `GET /orders/tracking-number/{tracking_number}`
- `POST /orders/{tracking_number}/cancel`
- plus ecommerce checkout/payment routes

Mismatch:

- Marvel order is ecommerce purchase/order with products, payment, shop, shipment.
- Proffi task is a service request posted by a customer and browsed by specialists.

Recommendation:

- Do not force Proffi tasks into Marvel `orders` unless the бизнес-логика deliberately wants service requests to become ecommerce orders.
- Create custom Proffi service-task tables/controllers in Laravel:
  - `proffi_tasks`
  - `proffi_applications`
  - optional `proffi_task_photos`
- Keep endpoints as `/api/tasks...`.

Proffi task endpoints to implement:

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/mine`
- `GET /api/tasks/{task_id}`
- `DELETE /api/tasks/{task_id}`
- `GET /api/applications/mine`
- `POST /api/tasks/{task_id}/applications`
- `GET /api/tasks/{task_id}/applications`
- `POST /api/applications/{app_id}/accept`
- `GET /api/tasks/{task_id}/specialist-info`

### Applications / Offers

No direct Marvel model found that matches specialist offers to service task.

Closest candidates:

- `Question` - product Q&A, not suitable for offers.
- `Feedback` - not suitable for offers.
- `Order` child orders - ecommerce shop flow, not ideal.

Recommendation:

- Add `proffi_applications` table.

Expected fields:

- `id`
- `task_id`
- `specialist_id`
- `message`
- `price`
- `status`
- `created_at`

Response should enrich:

- `task_title`
- `specialist_name`
- `specialist_rating`
- `specialist_city`

### Chats

Files:

- `app/Http/Controllers/ChatController.php`
- `packages/marvel/src/Http/Controllers/ConversationController.php`
- `packages/marvel/src/Http/Controllers/MessageController.php`
- `packages/marvel/src/Database/Models/Conversation.php`
- `packages/marvel/src/Database/Models/Message.php`
- `packages/marvel/src/Database/Models/Participant.php`
- migration `packages/marvel/database/migrations/2022_05_09_070829_create_messages_table.php`
- root migrations:
  - `database/migrations/2025_01_15_000001_add_type_to_conversations_table.php`
  - `database/migrations/2025_01_15_000002_add_read_at_to_messages_table.php`
  - `database/migrations/2025_01_15_000003_create_attachments_table.php`
  - `database/migrations/2025_01_15_000004_create_conversation_user_pivot_table.php`

Routes:

- `GET /conversations`
- `POST /conversations`
- `GET /conversations/{conversation_id}`
- `GET /messages/conversations/{conversation_id}`
- `POST /messages/conversations/{conversation_id}`
- `POST /messages/seen/{conversation_id}`
- compatibility:
  - `GET /chat/conversations`
  - `GET /chat/conversations/{id}`
  - `POST /chat/messages`
  - `POST /chat/attachments`
  - `POST /chat/conversations/{id}/read`

Mismatch:

- Marvel conversation is based on `user_id + shop_id`.
- Proffi chat is based on `task_id + customer_id + specialist_id`.

Possible strategies:

1. Reuse Marvel conversations by creating a shop for every specialist.
   - Pros: uses existing chat tables.
   - Cons: awkward if Proffi specialists are not shops; task linkage still missing.

2. Add Proffi-specific chat tables.
   - Pros: exact Proffi contract.
   - Cons: duplicates part of Marvel chat system.

3. Hybrid: add `proffi_tasks/proffi_applications` and reuse `conversations/messages` with extra link table:
   - `proffi_task_chats(task_id, application_id, conversation_id, customer_id, specialist_id)`
   - Adapter maps `Conversation + Message` into Proffi `Chat + Message`.

Recommended: option 3. It preserves Marvel message infrastructure while giving Proffi exact task linkage.

Proffi chat endpoints to implement:

- `GET /api/chats`
- `GET /api/chats/{chat_id}`
- `GET /api/chats/{chat_id}/messages`
- `POST /api/chats/{chat_id}/messages`

Adapter mapping:

- `Chat.id` -> `conversation.id` or `proffi_task_chats.id` depending chosen model.
- `Chat.task_id` -> `proffi_task_chats.task_id`
- `Chat.customer_id` -> `proffi_task_chats.customer_id`
- `Chat.specialist_id` -> `proffi_task_chats.specialist_id`
- `Message.text` -> Marvel `messages.body`
- `Message.sender_id` -> Marvel `messages.user_id`

### Uploads / Files

Files:

- `packages/marvel/src/Http/Controllers/AttachmentController.php`
- `packages/marvel/src/Database/Models/Attachment.php`
- `app/Models/Attachment.php`
- chat attachments also exist.

Routes:

- `apiResource('attachments')` public and auth variants.
- `POST /chat/attachments`

Proffi expected:

- `POST /api/uploads` multipart `file`, response `{ path }`
- `GET /api/files/{path}` public file stream

Adapter needed:

- Either call Marvel `AttachmentController` internally or store via Laravel Storage directly.
- Return simple `{ path }`.
- Ensure `fileUrl()` from client works with `/api/files/{path}`.

### Specialists

No exact Proffi specialist endpoint exists.

Possible mappings:

- Marvel users with permission `store_owner`
- users with profile `market_role=specialist` if existing field is used
- shops owners

Proffi expected:

- `GET /api/specialists`
- `GET /api/specialists/{user_id}`

Adapter needed:

- Query `User` + `Profile`, filter by permission/role.
- Map to Proffi `UserPublic`.

### Admin

Marvel has super-admin routes:

- `apiResource('users', UserController::class)`
- category CRUD
- billing/admin routes

Proffi admin expects:

- header `X-Admin-Token`, not Sanctum super-admin Bearer.
- `/api/admin/stats`
- `/api/admin/users`
- `/api/admin/categories`
- `/api/admin/filters`
- `/api/admin/seed`

Recommendation:

- For quick compatibility, implement Proffi admin adapter with `X-Admin-Token` from env.
- It can call Marvel models directly.
- Later can migrate admin to Sanctum super-admin login if desired.

## Proposed New Laravel Files

Recommended adapter namespace:

- `app/Http/Controllers/Proffi/AuthController.php`
- `app/Http/Controllers/Proffi/TaskController.php`
- `app/Http/Controllers/Proffi/ApplicationController.php`
- `app/Http/Controllers/Proffi/ChatController.php`
- `app/Http/Controllers/Proffi/CategoryController.php`
- `app/Http/Controllers/Proffi/SpecialistController.php`
- `app/Http/Controllers/Proffi/UploadController.php`
- `app/Http/Controllers/Proffi/AdminController.php`

Recommended routes:

- `routes/proffi.php`, included from `routes/api.php`, or directly appended to `routes/api.php`.

Recommended models/tables:

- `App\Models\ProffiTask`
- `App\Models\ProffiApplication`
- `App\Models\ProffiTaskChat`

Possible migrations:

- `create_proffi_tasks_table`
- `create_proffi_applications_table`
- `create_proffi_task_chats_table`

## Adapter Route List

These should be implemented under the actual Laravel `/api` prefix:

```php
Route::prefix('auth')->group(function () {
    Route::post('check-phone', ...);
    Route::post('register-phone', ...);
    Route::post('register', ...);
    Route::post('login', ...);
    Route::post('verify', ...);
    Route::middleware('auth:sanctum')->get('me', ...);
    Route::middleware('auth:sanctum')->get('stats', ...);
    Route::middleware('auth:sanctum')->patch('profile', ...);
});

Route::get('stories', ...);
Route::get('categories', ...);
Route::get('tasks', ...);
Route::middleware('auth:sanctum')->post('tasks', ...);
Route::middleware('auth:sanctum')->get('tasks/mine', ...);
Route::get('tasks/{task}', ...);
Route::middleware('auth:sanctum')->delete('tasks/{task}', ...);
Route::middleware('auth:sanctum')->post('tasks/{task}/applications', ...);
Route::middleware('auth:sanctum')->get('tasks/{task}/applications', ...);
Route::middleware('auth:sanctum')->post('applications/{application}/accept', ...);
Route::middleware('auth:sanctum')->get('applications/mine', ...);
Route::middleware('auth:sanctum')->get('tasks/{task}/specialist-info', ...);

Route::middleware('auth:sanctum')->get('chats', ...);
Route::middleware('auth:sanctum')->get('chats/{chat}', ...);
Route::middleware('auth:sanctum')->get('chats/{chat}/messages', ...);
Route::middleware('auth:sanctum')->post('chats/{chat}/messages', ...);

Route::get('specialists', ...);
Route::get('specialists/{user}', ...);

Route::middleware('auth:sanctum')->post('uploads', ...);
Route::get('files/{path}', ...)->where('path', '.*');

Route::prefix('admin')->group(function () {
    Route::get('stats', ...);
    Route::get('users', ...);
    Route::post('users', ...);
    Route::delete('users/{user}', ...);
    Route::get('categories', ...);
    Route::post('categories', ...);
    Route::delete('categories/{category}', ...);
    Route::get('filters', ...);
    Route::post('filters', ...);
    Route::put('filters/{filter}', ...);
    Route::delete('filters/{filter}', ...);
    Route::post('seed', ...);
});
```

## Local Laravel Bring-Up Checklist

Blocked until PHP/Composer are available. Once available:

1. Create local `.env` from current `.env`, but change:
   - `APP_ENV=local`
   - `APP_DEBUG=true`
   - `APP_URL=http://127.0.0.1:8001`
   - `CACHE_DRIVER=file`
   - `QUEUE_CONNECTION=sync`
   - `SESSION_DRIVER=file`
   - local DB credentials
2. Create `storage/` and writable subfolders if missing:
   - `storage/app`
   - `storage/framework/cache`
   - `storage/framework/sessions`
   - `storage/framework/views`
   - `storage/logs`
3. Run `composer install`.
4. Run `php artisan key:generate` if key is missing.
5. Run migrations/import existing database.
6. Run `php artisan route:list` and verify Proffi adapter routes.
7. Run `php artisan serve --host=127.0.0.1 --port=8001`.
8. Set mobile/web clients to `http://127.0.0.1:8001`.

## Immediate Questions For Implementation

1. Для Proffi `specialist` делаем отдельную роль/permission `specialist`, или используем Marvel `store_owner`?
2. Proffi task должен быть новой сущностью `proffi_tasks`, или ты хочешь пытаться связать его с Marvel `orders/products`?
3. Чат лучше связать с existing Marvel `conversations/messages` через `proffi_task_chats`, или сделать отдельные `proffi_chats/proffi_messages`?
4. База в Laravel уже должна использовать текущий MySQL dump `backup_before_migration.sql`, или будем поднимать чистую локальную базу?
5. PHP/Composer установлены где-то не в PATH, или нужно ориентироваться на Docker?
