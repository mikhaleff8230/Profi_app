# Аудит Places перед интеграцией с TREABO/Proffi

Дата аудита: 16 сентября 2026 года.

## Вывод

В проекте уже существует полноценный контур Places в Laravel-пакете `pixer-api/packages/marvel`. Он использует общую таблицу `users`, Sanctum и основную БД приложения. Создавать `proffi_places` или отдельную систему пользователей не требуется. Безопасный путь — минимально расширить `places` и `place_images`, оставить legacy REST-контракты без изменений и предоставить TREABO отдельные ресурсы и контроллеры в `/api/proffi/places`.

`Place` и `ProffiTask` сейчас не связаны. `RequestDraft` является действующим входом в AI Assistant и публикуется через `RequestDraftPublisher`; именно этот поток должен получить ссылку `source_place_id`.

## Текущие модели и таблицы

### Places (Marvel/SANCAN)

- `Marvel\Database\Models\Place` → `places`.
- Текущие поля `places`: `id`, `user_id`, `title`, `description`, timestamps; поздние миграции добавляют `source_url`, `slug`, `language`.
- `Place` принадлежит `Marvel\Database\Models\User` через `user_id`. Это тот же Eloquent user provider и та же таблица `users`, которые использует Proffi.
- `PlaceImage` → `place_images`: `id`, `place_id`, `url`, timestamps. Дополнительная legacy-миграция добавляет thumbnail и технические параметры изображения.
- `PlaceVideo` → `place_videos`, включая preview/poster/thumbnail и метаданные.
- `PlaceWishlist` → `place_wishlists`, уникальная пара `(user_id, place_id)`.
- `PlaceLike`, `PlaceComment`, `PlaceFollow`, `PlaceSlugHistory` и pivot-таблицы hashtags/products уже связаны с `Place`.
- `Place` индексируется в Elasticsearch через `PlaceElasticsearchObserver` при включённом Elasticsearch.
- Подсчёт Places участвует в legacy billing/invoices (`BillingInfoController`, `GenerateMonthlyInvoices`, `AutoRenewSubscriptions`).

### Proffi

- `App\Models\ProffiTask` → `proffi_tasks`; заявки имеют customer, accepted specialist, category/work, geo, photos, applications, matching и chat.
- Реальные статусы задач в коде: `open`, `in_progress`, `done`, `cancelled`; в нескольких местах также учитывается `completed`. Adapter Task → Place должен принимать `done` и `completed`, не вводя новый task lifecycle.
- `App\Models\RequestDraft` → `request_drafts` (ULID). Текущий runtime хранит snapshot, выбранные category/work, transcript, ответы, status/version и ссылку на опубликованный task.
- `RequestDraftOrchestrator` создаёт и ведёт существующий AI-диалог. `DialogueInferenceService` получает выбранные category/work и каталог вопросов. Отдельный AI для Places не нужен.
- `RequestDraftPublisher` создаёт `ProffiTask`, переносит category/work/location/budget/photos/AI metadata и запускает `MasterMatchingService`.
- `proffi_categories` использует строковый PK длиной 64; `proffi_works` использует bigint и ссылается на категорию.
- `ProffiReview` является источником рейтинга и количества отзывов мастера.
- `ProffiUserPresence` является источником online/last seen.

## Текущий API Places

Legacy routes находятся в `packages/marvel/src/Rest/Routes.php`:

- публичные `GET /api/places`, `/api/places/feed`, `/api/places/favorites`, `/api/places/{slugId}`, `/api/places/{id}/similar`;
- auth CRUD `apiResource('places', PlaceController::class)`;
- `place-wishlists`, `place-likes`, comments и follow endpoints;
- parser/import и hashtag/product integrations.

`PlaceController` содержит около 1200 строк и совмещает query, SEO redirects, validation, S3 upload, video processing, hashtag/product sync и CRUD. Копировать его в Proffi нельзя. Новый Proffi-контроллер должен работать через небольшой сервис и отдельные ресурсы.

Legacy `PlaceResource` и `PlaceFeedResource` возвращают SEO slug/url, author, media, hashtags/products и social counters. Их контракт менять нельзя.

## Авторизация и policy

- Legacy `PlacePolicy` разрешает update владельцу, delete владельцу или super admin.
- Policy существует, но не зарегистрирована в `App\Providers\AuthServiceProvider`; legacy вызовы `$this->authorize()` поэтому зависят от неявного discovery, которое не соответствует namespace `Marvel\Policies`. Регистрацию нужно сделать явно.
- Proffi использует `auth:sanctum` и тот же `Marvel\Database\Models\User`.
- `source_task_id` нельзя принимать как доверенное поле. Право имеет accepted specialist завершённой (`done`/`completed`) задачи, с fallback на принятую application для старых данных.

## Media и storage

- Legacy Place upload пишет изображения/видео напрямую в S3 и создаёт `place_images`/`place_videos`.
- Proffi уже имеет общий `POST /api/proffi/uploads`, который пишет в настроенный `proffi_upload_disk` и возвращает `disk`, `path`, `url`, `mime`, `size`.
- Для TREABO Places следует принимать URL уже загруженных через этот endpoint изображений и создавать `place_images`; base64 хранить нельзя.
- В существующей схеме нет upload entity с `user_id`, поэтому доказать ownership произвольного URL невозможно. Новый API должен принимать внутренние Proffi file URLs, уже принадлежащие Place того же пользователя или media разрешённой source task. Полная ownership-модель upload является отдельным усилением.
- В `place_images` сейчас нет явного порядка или cover-флага; TREABO нужны additive-поля `sort_order` и `is_cover`.

## Favorites, likes и comments

- Place favorites уже реализованы таблицей `place_wishlists`; её следует переиспользовать.
- Task favorites находятся отдельно в `proffi_favorites` и жёстко связаны с `proffi_tasks`. Объединять таблицы в этой миграции рискованно.
- Proffi API может дать единый UX через отдельные Place favorite endpoints, сохранив обе текущие таблицы и контракты.
- Likes/comments остаются legacy-функциями и могут использоваться как реальные popularity signals; новые дубли не нужны.

## Geo, category, work и price

В legacy `places` отсутствуют Proffi category/work, city/location, coordinates, price/hide_price и lifecycle. Их можно добавить nullable/additive полями. Для старых записей безопасный status — `published`, чтобы они не исчезли из Marvel/SANCAN выдачи.

`russia_locations`, `proffi_categories` и `proffi_works` уже являются действующими каталогами. Новые справочники Places не нужны.

## Frontend usage

- Текущие TREABO mobile apps (`mobile`, `mobile-specialist`) не вызывают Places API; их карты работают с tasks.
- Текущий TREABO web (`shop/src`) не содержит активных Place screens/API clients; упоминания Place в основном относятся к placeholders и map placemarks.
- Legacy SANCAN contracts остаются востребованными backend routes, SEO sitemap, Elasticsearch, parser/import, billing и social endpoints. Их нельзя переименовывать или переводить на новый resource.
- Новый mobile datasource можно строить независимо на `/api/proffi/places`, не меняя legacy frontend.

## Reusable components

- `places`, `place_images`, `place_wishlists` и `Marvel\Database\Models\User`.
- `POST /api/proffi/uploads` и настроенные filesystem disks.
- `proffi_categories`, `proffi_works`, `russia_locations`.
- `RequestDraftOrchestrator`, `DialogueInferenceService`, `ConditionalQuestionEngine`, `RequestDraftPublisher`.
- `ProffiReview` и `ProffiUserPresence` для author DTO.
- `MasterMatchingService` остаётся только после публикации Task.

## Legacy dependencies и риски

1. Нельзя менять `PlaceResource`, `PlaceFeedResource` или legacy routes: SEO, parser, sitemap и SANCAN consumers зависят от них.
2. Legacy controller загружает до пяти картинок, Proffi upload допускает больше типов и другой лимит. Новый Place API должен иметь свой request contract и переиспользовать storage endpoint, а не legacy multipart implementation.
3. Старые Places не имеют category/geo/price. Новые поля должны быть nullable; Proffi public list может показывать только `status=published`, но не должна требовать заполненности новых полей для чтения legacy rows.
4. `Place` имеет Elasticsearch observer. Additive поля не ломают индекс, однако новый Proffi filtering выполняется в SQL, пока mapping отдельно не расширен.
5. Физическое удаление Place запускает legacy очистку S3. Замена изображений должна выполняться осторожно, чтобы не удалить URL, используемые другим контуром.
6. В task status naming есть рассогласование `done`/`completed`; adapter принимает оба.
7. В admin routes есть два mount point (`/api/proffi/admin` и `/api/admin`) для backward compatibility. Новые admin Place routes должны попасть в общий closure.
8. Репозиторий уже содержит незакоммиченные изменения в AI Assistant, admin и routes. Интеграция должна быть точечной и не откатывать их.

## Решение

Использовать существующий `Place` как отдельную content entity. Добавить отдельный Proffi service/controller/resources, additive schema fields и source references. Legacy controller остаётся рабочим; общая новая бизнес-логика создания/обновления TREABO Place располагается в `PlaceService` и может быть подключена к legacy позже без изменения его текущего контракта.
